import { HoverCard, HoverCardContent } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { TableMapType } from "@/validations/table-validation";
import { HoverCardTrigger } from "@radix-ui/react-hover-card";
import { Background, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";

export function TableNode({
  data,
}: {
  data: {
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
            "bg-muted rounded-lg flex items-center justify-center outline-2 outline-offset-4 outline-dashed",
            {
              "w-20 h-20": data.capacity === 2,
              "w-32 h-20": data.capacity === 4,
              "w-38 h-20": data.capacity === 6,
              "w-48 h-20": data.capacity === 8,
              "w-64 h-20": data.capacity === 10,
            },
            {
              "outline-amber-600": data.status === "reserved",
              "outline-green-600": data.status === "available",
              "outline-blue-600": data.status === "unavailable",
            },
          )}
        >
          {data.label}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="mt-2">
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">Table {data.label}</h4>
          <p className="text-xs text-muted-foreground">
            Capacity: {data.capacity}
          </p>
          <p className="text-xs text-muted-foreground">Status: {data.status}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default function TableMap({ tables }: { tables: TableMapType[] }) {
  const nodeTypes = {
    tableNode: TableNode,
  };

  const initialNodes = useMemo(() => {
    return tables.map((table) => ({
      id: table.id,
      position: { x: table.position_x, y: table.position_y },
      data: {
        label: table.name,
        capacity: table.capacity,
        status: table.status,
      },
      type: "tableNode",
    }));
  }, [tables]);

  return (
    <div className="w-[100%] h-[80vh] border rounded-lg">
      <ReactFlow
        proOptions={{ hideAttribution: true }}
        nodes={initialNodes}
        nodeTypes={nodeTypes}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
