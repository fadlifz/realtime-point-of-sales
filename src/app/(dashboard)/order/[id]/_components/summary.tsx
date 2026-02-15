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
  useState,
} from "react";
import { generatePayment } from "../../actions";
import { INITIAL_STATE_GENERATE_PAYMENT } from "@/constants/order-constant";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

interface SummaryProps {
  order: {
    customer_name: string;
    tables: { name: string }[];
    status: string;
    payment_token?: string | null;
  };
  orderMenu:
    | { menus: Menu; quantity: number; status: string; nominal: number }[]
    | null
    | undefined;
  id: string;
}

export default function Summary({ order, orderMenu, id }: SummaryProps) {
  const router = useRouter();
  const [isSnapOpen, setIsSnapOpen] = useState(false);
  const { grandTotal, totalPrice, tax, service } = usePricing(orderMenu);
  const profile = useAuthStore((state) => state.profile);

  const [
    generatePaymentState,
    generatePaymentAction,
    isPendingGeneratePayment,
  ] = useActionState(generatePayment, INITIAL_STATE_GENERATE_PAYMENT);

  const currentToken = useMemo(() => {
    return order?.payment_token || generatePaymentState.data?.payment_token;
  }, [order?.payment_token, generatePaymentState.data?.payment_token]);

  const isAllServed = useMemo(() => {
    return orderMenu?.every((item) => item.status === "served");
  }, [orderMenu]);

  const openSnapPopup = useCallback(
    (token: string) => {
      if (window.snap) {
        setIsSnapOpen(true);
        window.snap.pay(token, {
          onSuccess: () => {
            setIsSnapOpen(false);
            toast.success("Payment Successful!");
            router.push(`/payment/success?order_id=${id}`);
          },
          onPending: () => {
            setIsSnapOpen(false);
            router.refresh();
            toast.info("Waiting for payment.");
          },
          onClose: () => {
            setIsSnapOpen(false);
            router.refresh();
            toast.warning("Payment popup closed.");
          },
          onError: () => {
            setIsSnapOpen(false);
            router.refresh();
            toast.error("Payment Failed.");
          },
        });
      }
    },
    [id, router],
  );

  const handlePayClick = () => {
    if (currentToken) {
      openSnapPopup(currentToken);
      return;
    }

    const formData = new FormData();
    formData.append("id", id);
    formData.append("gross_amount", grandTotal.toString());
    formData.append("customer_name", order?.customer_name || "");

    startTransition(() => {
      generatePaymentAction(formData);
    });
  };

  useEffect(() => {
    if (generatePaymentState?.status === "error") {
      toast.error("Generate Payment Failed", {
        description: generatePaymentState.errors?._form?.[0],
      });
    }

    if (
      generatePaymentState?.status === "success" &&
      generatePaymentState.data?.payment_token &&
      !isSnapOpen
    ) {
      router.refresh();
      openSnapPopup(generatePaymentState.data.payment_token);
    }
  }, [generatePaymentState, openSnapPopup, router, isSnapOpen]);

  return (
    <Card className="w-full shadow-sm">
      <CardContent className="space-y-4 pt-6">
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
            <div className="space-y-3">
              <Button
                type="button"
                onClick={handlePayClick}
                disabled={
                  !isAllServed ||
                  isPendingGeneratePayment ||
                  isSnapOpen ||
                  orderMenu?.length === 0
                }
                className="w-full font-semibold bg-teal-500 hover:bg-teal-600 text-white py-6"
              >
                {isPendingGeneratePayment || isSnapOpen ? (
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                ) : null}
                {isSnapOpen
                  ? "Window Open..."
                  : currentToken
                    ? "Re-open Payment"
                    : "Pay Now"}
              </Button>

              {currentToken && !isSnapOpen && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertCircle className="h-4 w-4" /> Payment in Progress
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    The payment window was closed. Click{" "}
                    <strong>"Re-open Payment"</strong> to see your payment code
                    again.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
