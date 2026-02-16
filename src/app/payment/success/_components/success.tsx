"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function Success() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  // DEBUGGING: Cek semua parameter yang masuk di URL
  const allParams = Object.fromEntries(searchParams.entries());
  const order_id = searchParams.get("order_id");

  console.log("Full URL Params:", allParams);
  console.log("Extracted order_id:", order_id);

  const { mutate, isPending } = useMutation({
    mutationKey: ["mutateUpdateStatusOrder", order_id],
    mutationFn: async () => {
      console.log("Mutation started for order_id:", order_id);

      const { data, error } = await supabase
        .from("orders")
        .update({
          status: "settled",
        })
        .eq("order_id", order_id)
        .select()
        .single();

      if (error) {
        console.error("Supabase Update Order Error:", error);
        throw error;
      }

      console.log("Supabase Update Order Success:", data);

      if (data && data.table_id) {
        const { error: tableError } = await supabase
          .from("tables")
          .update({
            status: "available",
          })
          .eq("id", data.table_id);

        if (tableError)
          console.error("Supabase Update Table Error:", tableError);
        else console.log("Table status updated to available");
      }
    },
  });

  useEffect(() => {
    if (order_id) {
      mutate();
    } else {
      console.warn("useEffect triggered but order_id is missing!");
    }
  }, [order_id, mutate]);

  return (
    <div className="w-full h-screen flex flex-col justify-center items-center gap-4">
      <CheckCircle
        className={
          searchParams.get("order_id")
            ? "size-16 text-green-400"
            : "size-16 text-gray-300"
        }
      />

      <h1 className="text-2xl font-bold">
        {isPending ? "Updating Order Status..." : "Payment Success"}
      </h1>

      {/* Debug view di layar jika order_id hilang */}
      {!order_id && (
        <p className="text-red-500 text-sm bg-red-50 p-2 rounded">
          Warning: order_id not found in URL parameters!
        </p>
      )}

      <div className="flex gap-2">
        {/* Navigasi Utama */}
        <Button asChild variant={order_id ? "default" : "outline"}>
          <Link href={order_id ? `/order/${order_id}` : "/order"}>
            Back to Homepage
          </Link>
        </Button>
      </div>
    </div>
  );
}
