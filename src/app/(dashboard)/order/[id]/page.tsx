import Script from "next/script";
import DetailOrder from "./_components/detail-order";
import { environment } from "@/configs/environment";

export const metadata = {
  title: "WPU Cafe | Detail Order",
};

// Perbaikan Tipe Data agar lebih aman dan menghilangkan error ESLint
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

  // Midtrans Snap JS memiliki domain yang berbeda dengan API URL.
  // Sandbox: https://app.sandbox.midtrans.com/snap/snap.js
  // Production: https://app.midtrans.com/snap/snap.js
  const snapScriptUrl =
    environment.MIDTRANS_API_URL === "production" // Sesuaikan dengan variabel env production
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

  return (
    <div className="w-full">
      <Script
        src={snapScriptUrl}
        data-client-key={environment.MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive" // Lebih disarankan agar snap siap sebelum DetailOrder dipanggil
      />
      <DetailOrder id={id} />
    </div>
  );
}
