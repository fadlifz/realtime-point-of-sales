"use client";

import DataTable from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { HEADER_TABLE_DETAIL_ORDER } from "@/constants/order-constant";
import useDataTable from "@/hooks/use-data-table";
import { createClientSupabase } from "@/lib/supabase/default";
import { cn, convertIDR } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import Summary from "./summary";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical } from "lucide-react";
import { updateStatusOrderitem } from "../../actions";
import { INITIAL_STATE_ACTION } from "@/constants/general-constant";
import { useAuthStore } from "@/stores/auth-store";
import Receipt from "./receipt";

export default function DetailOrder({ id }: { id: string }) {
  const supabase = useMemo(() => createClientSupabase(), []);
  const queryClient = useQueryClient();
  const { currentPage, currentLimit, handleChangePage, handleChangeLimit } =
    useDataTable();
  const profile = useAuthStore((state) => state.profile);

  const { data: order, refetch: refetchOrder } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const result = await supabase
        .from("orders")
        .select(
          "id, customer_name, status, payment_token, tables (name, id), created_at",
        )
        .eq("order_id", id)
        .single();

      if (result.error) return null;
      return result.data;
    },
    enabled: !!id,
  });

  const {
    data: orderMenu,
    isLoading: isLoadingOrderMenu,
    refetch: refetchOrderMenu,
  } = useQuery({
    queryKey: ["orders_menu", id, currentPage, currentLimit],
    queryFn: async () => {
      const result = await supabase
        .from("orders_menus")
        .select("*, menus (id, name, image_url, price)", { count: "exact" })
        .eq("order_id", order?.id)
        .order("status");

      if (result.error) return null;
      return result;
    },
    enabled: !!order?.id,
  });

  // Fungsi refresh gabungan
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["order", id] });
    queryClient.invalidateQueries({ queryKey: ["orders_menu", id] });
  };

  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel(`order-sync-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders_menus",
          filter: `order_id=eq.${order.id}`,
        },
        () => refreshData(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        () => refreshData(),
      )
      .on("broadcast", { event: "force_refresh" }, () => refreshData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, id, supabase]);

  const [updateStatusOrderState, updateStatusOrderAction] = useActionState(
    updateStatusOrderitem,
    INITIAL_STATE_ACTION,
  );

  const handleUpdateStatusOrder = async (data: {
    id: string;
    status: string;
  }) => {
    const formData = new FormData();
    Object.entries(data).forEach(([Key, value]) => {
      formData.append(Key, value);
    });

    startTransition(() => {
      updateStatusOrderAction(formData);
      // Kirim sinyal broadcast agar tab sebelah langsung refresh
      supabase.channel(`order-sync-${id}`).send({
        type: "broadcast",
        event: "force_refresh",
      });
    });
  };

  useEffect(() => {
    if (updateStatusOrderState?.status === "error") {
      toast.error("Update Status Order Failed", {
        description: updateStatusOrderState.errors?._form?.[0],
      });
    }

    if (updateStatusOrderState?.status === "success") {
      toast.success("Update Status Order Success");
    }
  }, [updateStatusOrderState]);

  const filteredData = useMemo(() => {
    return (orderMenu?.data || []).map((item, index) => {
      return [
        currentLimit * (currentPage - 1) + index + 1,
        <div className="flex items-center gap-2" key={item.id}>
          <Image
            src={item.menus.image_url}
            alt={item.menus.name}
            width={40}
            height={40}
            className="rounded"
          />
          <div className="flex flex-col">
            {item.menus.name} x {item.quantity}
            <span className="text-xs text-muted-foreground">
              {item.notes || "No Notes"}
            </span>
          </div>
        </div>,
        <div key={`nominal-${item.id}`}>{convertIDR(item.nominal)}</div>,
        <div
          key={`status-${item.id}`}
          className={cn("px-2 py-1 rounded-full text-white w-fit capitalize", {
            "bg-gray-500": item.status === "pending",
            "bg-yellow-500": item.status === "process",
            "bg-blue-500": item.status === "ready",
            "bg-green-500": item.status === "served",
          })}
        >
          {item.status}
        </div>,
        <DropdownMenu key={`action-${item.id}`}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "data-[state=open]:bg-muted text-muted-foreground flex size-8",
                { hidden: item.status === "served" },
              )}
              size="icon"
            >
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {["pending", "process", "ready"].map((status, index) => {
              const nextStatus = ["process", "ready", "served"][index];
              return (
                item.status === status && (
                  <DropdownMenuItem
                    key={status}
                    onClick={() =>
                      handleUpdateStatusOrder({
                        id: item.id,
                        status: nextStatus,
                      })
                    }
                    className="capitalize"
                  >
                    {nextStatus}
                  </DropdownMenuItem>
                )
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>,
      ];
    });
  }, [orderMenu?.data, currentLimit, currentPage]);

  const totalPages = useMemo(() => {
    return orderMenu && orderMenu.count !== null
      ? Math.ceil(orderMenu.count / currentLimit)
      : 0;
  }, [orderMenu, currentLimit]);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">Detail Order</h1>
          <p className="text-sm text-muted-foreground">{id}</p>
        </div>
        <div className="flex items-center gap-2">
          {profile.role !== "kitchen" && order?.status === "process" && (
            <Link href={`/order/${id}/add`}>
              <Button>Add Order Item</Button>
            </Link>
          )}
          {order?.status === "settled" && (
            <Receipt order={order} orderMenu={orderMenu?.data} orderId={id} />
          )}
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-4 w-full">
        <div className="lg:w-2/3">
          <DataTable
            header={HEADER_TABLE_DETAIL_ORDER}
            data={filteredData}
            isLoading={isLoadingOrderMenu}
            totalPages={totalPages}
            currentPage={currentPage}
            currentLimit={currentLimit}
            onChangePage={handleChangePage}
            onChangeLimit={handleChangeLimit}
          />
        </div>
        <div className="lg:w-1/3">
          {order && (
            <Summary order={order} orderMenu={orderMenu?.data} id={id} />
          )}
        </div>
      </div>
    </div>
  );
}
