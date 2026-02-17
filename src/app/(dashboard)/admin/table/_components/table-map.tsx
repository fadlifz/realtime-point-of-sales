"use client";

import { HoverCard, HoverCardContent } from "@/components/ui/hover-card";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { TableMapType } from "@/validations/table-validation";
import { HoverCardTrigger } from "@radix-ui/react-hover-card";
import {
  applyNodeChanges,
  Background,
  NodeChange,
  ReactFlow,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState, useEffect } from "react";
import { toast } from "sonner";

// Komponen untuk tampilan Meja
export function TableNode({
  data,
}: {
  data: {
    id: string;
    label: string;
    capacity: number;
    status: string;
  };
}) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            "bg-muted rounded-lg flex items-center justify-center outline-2 outline-offset-4 outline-dashed transition-all",
            {
              "w-20 h-20": data.capacity === 2,
              "w-32 h-20": data.capacity === 4,
              "w-40 h-20": data.capacity === 6,
              "w-48 h-20": data.capacity === 8,
              "w-64 h-20": data.capacity === 10,
            },
            {
              "outline-amber-600 bg-amber-50": data.status === "reserved",
              "outline-green-600 bg-green-50": data.status === "available",
              "outline-blue-600 bg-blue-50": data.status === "unavailable",
            },
          )}
        >
          <span className="font-bold text-sm">{data.label}</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-48">
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-bold uppercase">Table {data.label}</h4>
          <div className="text-xs text-muted-foreground">
            <p>Capacity: {data.capacity} People</p>
            <p>
              Status: <span className="capitalize">{data.status}</span>
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default function TableMap({ tables }: { tables: TableMapType[] }) {
  const supabase = createClient();

  const nodeTypes = useMemo(
    () => ({
      tableNode: TableNode,
    }),
    [],
  );

  // Memetakan props tables ke format React Flow Nodes
  const initialNodes = useMemo(() => {
    return tables.map((table) => ({
      id: table.id,
      position: { x: table.position_x, y: table.position_y },
      data: {
        id: table.id,
        label: table.name,
        capacity: table.capacity,
        status: table.status,
      },
      type: "tableNode",
    }));
  }, [tables]);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);

  // KRUSIAL: Sinkronisasi state nodes saat props tables berubah (misal: tambah meja baru)
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  const onNodesChange = useCallback(
    async (changes: NodeChange[]) => {
      // 1. Update UI secara instan (Optimistic Update)
      setNodes((nds) => applyNodeChanges(changes, nds));

      // 2. Cari perubahan posisi yang sudah selesai (User lepas klik/drag)
      const positionChange = changes.find(
        (c) => c.type === "position" && c.dragging === false,
      );

      if (
        positionChange &&
        "position" in positionChange &&
        positionChange.position
      ) {
        const { error } = await supabase
          .from("tables")
          .update({
            position_x: Math.round(positionChange.position.x),
            position_y: Math.round(positionChange.position.y),
          })
          .eq("id", positionChange.id);

        if (!error) {
          toast.success(
            `Position ${tables.find((t) => t.id === positionChange.id)?.name} updated`,
          );
        } else {
          toast.error("Failed to update position");
        }
      }
    },
    [supabase, tables],
  );

  return (
    <div className="w-full h-[75vh] border rounded-xl bg-slate-50/50 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        // Membatasi agar tidak bisa drag keluar area terlalu jauh
        translateExtent={[
          [0, 0],
          [2000, 2000],
        ]}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
