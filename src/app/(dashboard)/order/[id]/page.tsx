import DetailOrder from "./_components/detail-order";

export const metadata = {
  title: "WPU Cafe | Detail Order",
};

export default async function DetailOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetailOrder id={id} />;
}
