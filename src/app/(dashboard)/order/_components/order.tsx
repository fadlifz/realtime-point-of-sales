"use client";

import DataTable from "@/components/common/data-table";
import DropdownAction from "@/components/common/dropdown-action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import useDataTable from "@/hooks/use-data-table";
import { createClientSupabase } from "@/lib/supabase/default";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Link2Icon, Package, ScrollText, Utensils } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HEADER_TABLE_ORDER } from "@/constants/order-constant";
import { updateReservation } from "../actions";
import { INITIAL_STATE_ACTION } from "@/constants/general-constant";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import DialogCreateOrderDineIn from "./dialog-create-order-dine-in";
import DialogCreateOrderTakeaway from "./dialog-create-order-takeaway";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TableMap from "./table-map";

export default function OrderManagement() {
  const supabase = createClientSupabase();
  const queryClient = useQueryClient();

  const {
    currentPage,
    currentLimit,
    currentSearch,
    handleChangePage,
    handleChangeLimit,
    handleChangeSearch,
  } = useDataTable();
  const profile = useAuthStore((state) => state.profile);

  // State untuk mengunci notifikasi agar tidak duplikat
  const [lastProcessedState, setLastProcessedState] = useState<any>(null);

  const {
    data: orders,
    isLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["orders", currentPage, currentLimit, currentSearch],
    queryFn: async () => {
      const query = supabase
        .from("orders")
        .select(
          `id, order_id, customer_name, status, payment_token, tables (name, id)`,
          { count: "exact" },
        )
        .range((currentPage - 1) * currentLimit, currentPage * currentLimit - 1)
        .order("created_at", { ascending: false });

      if (currentSearch) {
        query.or(
          `order_id.ilike.%${currentSearch}%,customer_name.ilike.%${currentSearch}%`,
        );
      }

      const result = await query;
      if (result.error) toast.error("Get Order data failed");
      return result;
    },
  });

  const { data: tables, refetch: refetchTables } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      const result = await supabase
        .from("tables")
        .select("*")
        .order("created_at")
        .order("status");
      return result.data;
    },
  });

  const { data: activeOrders, refetch: refetchActiveOrders } = useQuery({
    queryKey: ["active-orders"],
    queryFn: async () => {
      const query = supabase
        .from("orders")
        .select(
          `id, order_id, customer_name, status, payment_token, tables (name, id)`,
        )
        .in("status", ["process", "reserved"])
        .order("created_at");

      const result = await query;
      if (result.error) toast.error("Get Order data failed");
      return result;
    },
  });

  // REALTIME SYNC
  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["tables"] });
          refetchOrders();
          refetchTables();
          refetchActiveOrders();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, refetchOrders, refetchTables]);

  const totalPages = useMemo(() => {
    return orders && orders.count !== null
      ? Math.ceil(orders.count / currentLimit)
      : 0;
  }, [orders, currentLimit]);

  const [reservedState, reservedAction] = useActionState(
    updateReservation,
    INITIAL_STATE_ACTION,
  );

  const handleReservation = async ({ id, table_id, status }: any) => {
    const formData = new FormData();
    formData.append("id", id);
    if (table_id) formData.append("table_id", table_id);
    formData.append("status", status);
    startTransition(() => {
      reservedAction(formData);
    });
  };

  // HANDLING NOTIFICATION (FIX DUPLICATE TOAST)
  useEffect(() => {
    if (
      reservedState?.status === "success" &&
      reservedState !== lastProcessedState
    ) {
      toast.success("Update Reservation Success");
      setLastProcessedState(reservedState); // Kunci state ini

      queryClient.invalidateQueries({ queryKey: ["orders"] });
      refetchOrders();
      refetchTables();
      refetchActiveOrders();
    }

    if (
      reservedState?.status === "error" &&
      reservedState !== lastProcessedState
    ) {
      toast.error("Update Reservation Failed", {
        description: reservedState.errors?._form?.[0],
      });
      setLastProcessedState(reservedState); // Kunci state ini
    }
  }, [
    reservedState,
    queryClient,
    refetchOrders,
    refetchTables,
    lastProcessedState,
  ]);

  const filteredData = useMemo(() => {
    return (orders?.data || []).map((order, index) => {
      return [
        currentLimit * (currentPage - 1) + index + 1,
        order.order_id,
        order.customer_name,
        (order.tables as unknown as { name: string })?.name || "Takeaway",
        <div
          key={order.id}
          className={cn(
            "px-2 py-1 rounded-full text-white w-fit capitalize text-xs",
            {
              "bg-lime-600": order.status === "settled",
              "bg-sky-600": order.status === "process",
              "bg-amber-600": order.status === "reserved",
              "bg-red-600": order.status === "canceled",
            },
          )}
        >
          {order.status}
        </div>,
        <DropdownAction
          key={`action-${order.id}`}
          menu={
            order.status === "reserved" && profile.role !== "kitchen"
              ? [
                  {
                    label: (
                      <span className="flex items-center gap-2">
                        <Link2Icon size={14} /> Process
                      </span>
                    ),
                    action: () =>
                      handleReservation({
                        id: order.id,
                        table_id: (order.tables as any)?.id,
                        status: "process",
                      }),
                  },
                  {
                    label: (
                      <span className="flex items-center gap-2 text-red-500">
                        <Ban size={14} /> Cancel
                      </span>
                    ),
                    action: () =>
                      handleReservation({
                        id: order.id,
                        table_id: (order.tables as any)?.id,
                        status: "canceled",
                      }),
                  },
                ]
              : [
                  {
                    label: (
                      <Link
                        href={`/order/${order.order_id}`}
                        className="flex items-center gap-2"
                      >
                        <ScrollText size={14} /> Detail
                      </Link>
                    ),
                    type: "link",
                  },
                ]
          }
        />,
      ];
    });
  }, [orders, currentPage, currentLimit, profile.role]);

  const [openCreateOrder, setOpenCreateOrder] = useState(false);

  return (
    <div className="w-full">
      <Tabs defaultValue="list">
        <div className="flex flex-col lg:flex-row mb-4 gap-2 justify-between w-full">
          <h1 className="text-2xl font-bold">Order Management</h1>
          <TabsList>
            <TabsTrigger value="list">Order List</TabsTrigger>
            <TabsTrigger value="map">Table Map</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list">
          <div className="flex gap-2 justify-between mb-4">
            <Input
              placeholder="Search..."
              className="max-w-64"
              onChange={(e) => handleChangeSearch(e.target.value)}
            />
            {profile.role !== "kitchen" && (
              <DropdownMenu
                open={openCreateOrder}
                onOpenChange={setOpenCreateOrder}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Create</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Create Order</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Dialog>
                    <DialogTrigger className="flex items-center gap-2 text-sm p-2 w-full rounded-md hover:bg-muted transition-colors text-left">
                      <Utensils className="size-4" /> Dine In
                    </DialogTrigger>
                    <DialogCreateOrderDineIn
                      tables={tables}
                      closeDialog={() => setOpenCreateOrder(false)}
                    />
                  </Dialog>
                  <Dialog>
                    <DialogTrigger className="flex items-center gap-2 text-sm p-2 w-full rounded-md hover:bg-muted transition-colors text-left">
                      <Package className="size-4" /> Takeaway
                    </DialogTrigger>
                    <DialogCreateOrderTakeaway
                      closeDialog={() => setOpenCreateOrder(false)}
                    />
                  </Dialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <DataTable
            header={HEADER_TABLE_ORDER}
            data={filteredData}
            isLoading={isLoading}
            totalPages={totalPages}
            currentPage={currentPage}
            currentLimit={currentLimit}
            onChangePage={handleChangePage}
            onChangeLimit={handleChangeLimit}
          />
        </TabsContent>

        <TabsContent value="map">
          <TableMap
            tables={tables || []}
            activeOrders={activeOrders?.data || []}
            handleReservation={(
              id: string,
              table_id: string,
              status: string,
            ) => {
              handleReservation({ id, table_id, status });
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
