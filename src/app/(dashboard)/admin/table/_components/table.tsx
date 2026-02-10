"use client";

import DataTable from "@/components/common/data-table";
import DropdownAction from "@/components/common/dropdown-action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import useDataTable from "@/hooks/user-data-table";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Table } from "@/validations/table-validation";
import { HEADER_TABLE_TABLE } from "@/constants/table-constant";

export default function TableManagement() {
  const supabase = createClient();
  const {
    currentPage,
    currentLimit,
    currentSearch,
    handleChangePage,
    handleChangeLimit,
    handleChangeSearch,
  } = useDataTable();

  const {
    data: tables,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["tables", currentPage, currentLimit, currentSearch],
    queryFn: async () => {
      const query = supabase
        .from("tables")
        .select("*", { count: "exact" })
        .range((currentPage - 1) * currentLimit, currentPage * currentLimit - 1)
        .order("created_at");

      // FIX: Kita hanya search kolom bertipe teks saja (name & status)
      // Kolom 'capacity' dilewati karena bertipe numeric dan tidak cocok dengan ilike
      if (currentSearch) {
        query.or(
          `name.ilike.%${currentSearch}%,status.ilike.%${currentSearch}%`,
        );
      }

      const result = await query;

      if (result.error)
        toast.error("Get Table data failed", {
          description: result.error.message,
        });

      return result;
    },
  });

  const [selectedAction, setSelectedAction] = useState<{
    data: Table;
    type: "update" | "delete";
  } | null>(null);

  const handleChangeAction = (open: boolean) => {
    if (!open) setSelectedAction(null);
  };

  const filteredData = useMemo(() => {
    return (tables?.data || []).map((table: Table, index) => {
      return [
        currentLimit * (currentPage - 1) + index + 1,
        <div>
          <h4 className="font-bold">{table.name}</h4>
          <p className="text-xs text-muted-foreground">
            {table.description || "-"}
          </p>
        </div>,
        table.capacity,
        <div
          className={cn(
            "px-2 py-1 rounded-full text-white w-fit text-xs capitalize",
            {
              "bg-green-600": table.status === "available",
              "bg-red-600": table.status === "unavailable",
              "bg-yellow-600": table.status === "reserved",
            },
          )}
        >
          {table.status}
        </div>,
        <DropdownAction
          menu={[
            {
              label: (
                <span className="flex items-center gap-2">
                  <Pencil size={16} />
                  Edit
                </span>
              ),
              action: () => {
                setSelectedAction({
                  data: table,
                  type: "update",
                });
              },
            },
            {
              label: (
                <span className="flex items-center gap-2">
                  <Trash2 size={16} className="text-red-400" />
                  Delete
                </span>
              ),
              variant: "destructive",
              action: () => {
                setSelectedAction({
                  data: table,
                  type: "delete",
                });
              },
            },
          ]}
        />,
      ];
    });
  }, [tables, currentLimit, currentPage]);

  const totalPages = useMemo(() => {
    return tables && tables.count !== null
      ? Math.ceil(tables.count / currentLimit)
      : 0;
  }, [tables, currentLimit]);

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row mb-4 gap-2 justify-between w-full">
        <h1 className="text-2xl font-bold">Table Management</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Search by name or status..."
            className="max-w-sm"
            onChange={(e) => handleChangeSearch(e.target.value)}
          />
          <Dialog>
            <DialogTrigger asChild>
              <Button>Create Table</Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>
      <DataTable
        header={HEADER_TABLE_TABLE}
        data={filteredData}
        isLoading={isLoading}
        totalPages={totalPages}
        currentPage={currentPage}
        currentLimit={currentLimit}
        onChangePage={handleChangePage}
        onChangeLimit={handleChangeLimit}
      />
    </div>
  );
}
