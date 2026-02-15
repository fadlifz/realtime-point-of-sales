"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { usePricing } from "@/hooks/use-pricing";
import { convertIDR } from "@/lib/utils";
import { Menu } from "@/validations/menu-validation";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { generatePayment } from "../../actions";
import { INITIAL_STATE_GENERATE_PAYMENT } from "@/constants/order-constant";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useState } from "react";

// Perluas interface order untuk menerima payment_token
interface SummaryProps {
  order: {
    customer_name: string;
    tables: { name: string }[];
    status: string;
    payment_token?: string | null; // Tambahkan ini
  };
  orderMenu:
    | { menus: Menu; quantity: number; status: string }[]
    | null
    | undefined;
  id: string; // Ini adalah order_id (contoh: STARCAFE-123)
}

export default function Summary({ order, orderMenu, id }: SummaryProps) {
  const [isSnapOpen, setIsSnapOpen] = useState(false);
  const { grandTotal, totalPrice, tax, service } = usePricing(orderMenu);
  const profile = useAuthStore((state) => state.profile);

  const isAllServed = useMemo(() => {
    return orderMenu?.every((item) => item.status === "served");
  }, [orderMenu]);

  const [
    generatePaymentState,
    generatePaymentAction,
    isPendingGeneratePayment,
  ] = useActionState(generatePayment, INITIAL_STATE_GENERATE_PAYMENT);

  // Fungsi untuk memicu popup Midtrans
  const openSnapPopup = useCallback((token: string) => {
    if (window.snap) {
      setIsSnapOpen(true);
      window.snap.pay(token, {
        onSuccess: (result: any) => {
          setIsSnapOpen(false);
          toast.success("Payment Successful!");
        },
        onPending: (result: any) => {
          // JANGAN set setIsSnapOpen(false) di sini jika ingin tombol tetap disable
          // Tapi lebih baik biarkan disable agar tidak double input
          setIsSnapOpen(true);
          toast.info(
            "Waiting for your payment. Please complete the transaction.",
          );
        },
        onError: (result: any) => {
          setIsSnapOpen(false);
          toast.error("Payment Failed.");
        },
        onClose: () => {
          setIsSnapOpen(false);
          toast.warning("Payment popup closed.");
        },
      });
    }
  }, []);

  const handlePayClick = () => {
    // 1. CEK TOKEN: Jika di database sudah ada token untuk order ini, pakai yang ada
    if (order?.payment_token) {
      openSnapPopup(order.payment_token);
      return;
    }

    // 2. Jika belum ada token, baru panggil Server Action
    const formData = new FormData();
    formData.append("id", id || "");
    formData.append("gross_amount", grandTotal.toString());
    formData.append("customer_name", order?.customer_name || "");

    startTransition(() => {
      generatePaymentAction(formData);
    });
  };

  // Pantau hasil dari server action generatePayment
  useEffect(() => {
    if (generatePaymentState?.status === "error") {
      toast.error("Generate Payment Failed", {
        description: generatePaymentState.errors?._form?.[0],
      });
    }

    if (
      generatePaymentState?.status === "success" &&
      generatePaymentState.data?.payment_token
    ) {
      openSnapPopup(generatePaymentState.data.payment_token);
    }
  }, [generatePaymentState, openSnapPopup]);

  return (
    <Card className="w-full shadow-sm">
      <CardContent className="space-y-4 pt-6">
        {" "}
        {/* Tambah pt-6 agar rapi */}
        <h3 className="text-lg font-semibold">Customer Information</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={order?.customer_name} disabled />
          </div>
          <div className="space-y-2">
            <Label>Table</Label>
            <Input
              value={(order?.tables as any)?.name || "Takeaway"}
              disabled
            />
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Order Summary</h3>
          <div className="flex justify-between items-center text-sm">
            <p>Subtotal</p>
            <p>{convertIDR(totalPrice)}</p>
          </div>
          <div className="flex justify-between items-center text-sm">
            <p>Tax (12%)</p>
            <p>{convertIDR(tax)}</p>
          </div>
          <div className="flex justify-between items-center text-sm">
            <p>Service (5%)</p>
            <p>{convertIDR(service)}</p>
          </div>
          <Separator />
          <div className="flex justify-between items-center text-lg font-bold">
            <p>Total</p>
            <p className="text-teal-600">{convertIDR(grandTotal)}</p>
          </div>
          {order?.status === "process" && profile.role !== "kitchen" && (
            <div className="space-y-2">
              <Button
                type="button"
                onClick={handlePayClick}
                disabled={
                  !isAllServed ||
                  isPendingGeneratePayment ||
                  isSnapOpen ||
                  orderMenu?.length === 0
                }
                className="w-full font-semibold bg-teal-500 hover:bg-teal-600 text-white"
              >
                {isPendingGeneratePayment || isSnapOpen ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : null}

                {isSnapOpen
                  ? "Payment Window Open..."
                  : order?.payment_token
                    ? "Re-open Payment" // Jika tidak sengaja tertutup, tombolnya jadi 'Buka Lagi'
                    : "Pay Now"}
              </Button>

              {/* Info tambahan jika token sudah ada tapi popup tertutup */}
              {order?.payment_token && !isSnapOpen && (
                <p className="text-[11px] text-center text-amber-600 font-medium animate-pulse">
                  ⚠️ Transaksi sedang menunggu pembayaran.
                </p>
              )}
            </div>
          )}
          {/* OPTIONAL: Tambahkan tombol bantuan jika popup tertutup tapi token sudah ada */}
          {order?.payment_token && !isSnapOpen && (
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              Payment link has been generated. If the popup didn't appear,
              please refresh the page.
            </p>
          )}{" "}
        </div>
      </CardContent>
    </Card>
  );
}
