"use client";

import { useState, useEffect } from "react";
import LineCharts from "@/components/common/line-chart";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 6);
  lastWeek.setHours(0, 0, 0, 0);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders-per-day"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("created_at")
        .gte("created_at", lastWeek.toISOString())
        .order("created_at");

      const counts: Record<string, number> = {};

      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toISOString().slice(0, 10);
        counts[dateString] = 0;
      }

      (data ?? []).forEach((order) => {
        const date = new Date(order.created_at).toISOString().slice(0, 10);
        if (counts[date] !== undefined) {
          counts[date] += 1;
        }
      });

      return Object.entries(counts)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    enabled: isMounted,
  });

  if (!isMounted) return null;

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row mb-4 gap-2 justify-between w-full">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Order Create Per Week</CardTitle>
          <CardDescription>
            Showing orders from {lastWeek.toLocaleDateString()} to{" "}
            {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <div className="w-full h-64 p-6 overflow-hidden">
          <LineCharts data={orders} />
        </div>
      </Card>
    </div>
  );
}
