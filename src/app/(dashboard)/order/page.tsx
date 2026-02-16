import OrderManagement from "./_components/order";

// TAMBAHKAN DUA BARIS INI
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "STAR Cafe | Order Management",
};

export default function OrderManagementPage() {
  return <OrderManagement />;
}
