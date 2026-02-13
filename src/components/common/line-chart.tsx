import {
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Tooltip,
  XAxis,
} from "recharts";

export default function LineCharts({
  data,
}: {
  data: { name: string; total: number }[] | undefined;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 10, right: 40, left: 0, bottom: 5 }}
      >
        <Tooltip
          useTranslate3d={true}
          isAnimationActive={false}
          wrapperClassName="!bg-white z-20 dark:!bg-neutral-900 rounded-md shadow-lg border"
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#00bba7"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          isAnimationActive={false}
        />
        <XAxis
          dataKey="name"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(str) => str.slice(5, 10)}
          padding={{ left: 15, right: 15 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
