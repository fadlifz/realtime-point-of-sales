"use client";

import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function Failed() {
  const searchParams = useSearchParams();
  const order_id = searchParams.get("order_id");

  return (
    <div className="w-full flex flex-col justify-center items-center gap-4">
      <Ban className="size-15 text-red-500" />
      <h1 className="text-2xl font-bold">Payment Failed</h1>

      {/* Mengarahkan kembali ke detail order berdasarkan order_id dari URL */}
      <Link href={`/order/${order_id}`}>
        <Button variant="default">Back To Order</Button>
      </Link>
    </div>
  );
}
