import Script from "next/script";
import DetailOrder from "./_components/detail-order";
import { environment } from "@/configs/environment";

export const metadata = {
  title: "STAR Cafe | Detail Order",
};

declare global {
  interface Window {
    snap: {
      pay: (snapToken: string, options?: unknown) => void;
      embed: (snapToken: string, options?: unknown) => void;
    };
  }
}

export default async function DetailOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const snapScriptUrl =
    environment.MIDTRANS_API_URL === "production"
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

  return (
    <div className="w-full">
      <Script
        src={snapScriptUrl}
        data-client-key={environment.MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />
      <DetailOrder id={id} />
    </div>
  );
}
