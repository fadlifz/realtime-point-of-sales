"use client";

import { useState, useEffect } from "react";
import LineCharts from "@/components/common/line-chart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { convertIDR } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 6);
  lastWeek.setHours(0, 0, 0, 0);

  const { data: orders } = useQuery({
    queryKey: ["orders-per-day"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("updated_at")
        .eq("status", "settled")
        .gte("updated_at", lastWeek.toISOString())
        .order("updated_at");

      const counts: Record<string, number> = {};

      // PENTING: Inisialisasi 7 hari agar grafik tidak patah/kosong
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateString = d.toISOString().slice(0, 10);
        counts[dateString] = 0;
      }

      (data ?? []).forEach((order) => {
        const date = new Date(order.updated_at).toISOString().slice(0, 10);
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

  const thisMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();

  const lastMonth = new Date(new Date().getFullYear(), 0, 1).toISOString();

  const { data: revenue } = useQuery({
    queryKey: ["revenue-this-month"],
    queryFn: async () => {
      const { data: dataThisMonth } = await supabase
        .from("orders_menus")

        .select("nominal, created_at")
        .gte("created_at", thisMonth);

      const { data: dataLastMonth } = await supabase
        .from("orders_menus")
        .select("nominal, created_at")
        .gte("created_at", lastMonth)
        .lt("created_at", thisMonth);

      const totalRevenueThisMonth = (dataThisMonth ?? []).reduce(
        (sum, item) => {
          return sum + item.nominal;
        },
        0,
      );

      const totalRevenueLastMonth = (dataLastMonth ?? []).reduce(
        (sum, item) => {
          return sum + item.nominal;
        },
        0,
      );

      let growthRate: string;

      if (totalRevenueLastMonth === 0) {
        growthRate = "0";
      } else {
        growthRate = (
          ((totalRevenueThisMonth - totalRevenueLastMonth) /
            totalRevenueLastMonth) *
          100
        ).toFixed(2);
      }
      const daysInData = new Set(
        (dataThisMonth ?? []).map((item) =>
          new Date(item.created_at).toISOString().slice(0, 10),
        ),
      ).size;

      const averageRevenueThisMonth =
        daysInData > 0 ? totalRevenueThisMonth / daysInData : 0;

      return {
        totalRevenueThisMonth,
        totalRevenueLastMonth,
        averageRevenueThisMonth,
        growthRate,
      };
    },
    enabled: isMounted,
  });

  const { data: totalOrder } = useQuery({
    queryKey: ["total-order"],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact" })
        .eq("status", "settled")
        .gte("created_at", thisMonth);
      return count;
    },
    enabled: isMounted,
  });

  const { data: lastOrder } = useQuery({
    queryKey: ["last-order"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_id, customer_name, status, tables(name, id)")
        .eq("status", "process")
        .limit(5)
        .order("created_at", { ascending: false });
      return data;
    },
    enabled: isMounted,
  });

  if (!isMounted) return null;
  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row mb-4 gap-2 justify-between w-full">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {convertIDR(revenue?.totalRevenueThisMonth ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardFooter>
            <div className="text-muted-foreground text-sm">
              *Revenue this month
            </div>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Average Revenue</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {convertIDR(revenue?.averageRevenueThisMonth ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardFooter>
            <div className="text-muted-foreground text-sm">
              *Average per day
            </div>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Order</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {totalOrder ?? 0}
            </CardTitle>
          </CardHeader>
          <CardFooter>
            <div className="text-muted-foreground text-sm">
              *Order settled this month
            </div>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Growth Rate</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {revenue?.growthRate ?? 0}%
            </CardTitle>
          </CardHeader>
          <CardFooter>
            <div className="text-muted-foreground text-sm">
              *Compared to last month
            </div>
          </CardFooter>
        </Card>
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        <Card className="w-full lg:w-2/3">
          <CardHeader>
            <CardTitle>Order Settled Per Week</CardTitle>
            <CardDescription>
              Showing orders from {lastWeek.toLocaleDateString()} to{" "}
              {new Date().toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <div className="w-full h-64 p-6 overflow-hidden">
            <LineCharts data={orders} />
          </div>
        </Card>
        <Card className="w-full lg:w-1/3">
          <CardHeader>
            <CardTitle>Active Order</CardTitle>
            <CardDescription>Showing last 5 active orders</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            {lastOrder && lastOrder.length > 0 ? (
              lastOrder.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-4 justify-between mb-4 border-b pb-2 last:border-0"
                >
                  <div className="overflow-hidden">
                    <h3 className="font-semibold truncate">
                      {order.customer_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Table: {(order.tables as any)?.name ?? "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      ID: {order.order_id}
                    </p>
                  </div>
                  <Link href={`/order/${order.order_id}`}>
                    <Button size="sm">Detail</Button>
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No active orders</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
