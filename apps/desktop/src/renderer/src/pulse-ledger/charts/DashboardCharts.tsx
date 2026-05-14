import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis
} from 'recharts';
import type { AnnualBar, SparkPoint } from '../data/fakeData';
import { LiquidProgressRing } from '../components/ui/LiquidProgressRing';

const teal = 'var(--pl-teal)';
const dataBlue = 'var(--pl-blue)';

export function StockSparkline({ data }: { data: SparkPoint[] }): JSX.Element {
  return (
    <div className="h-[112px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="i" hide />
          <YAxis domain={['dataMin - 0.02', 'dataMax + 0.02']} hide />
          <Line
            type="monotone"
            dataKey="v"
            stroke={teal}
            strokeWidth={2}
            strokeOpacity={0.92}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnnualProfitBars({ data }: { data: AnnualBar[] }): JSX.Element {
  return (
    <div className="h-[140px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="m"
            tick={{ fill: 'var(--pl-chart-tick)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis hide domain={[0, 'dataMax + 8']} />
          <Bar
            dataKey="p"
            fill={dataBlue}
            radius={[8, 8, 0, 0]}
            fillOpacity={0.82}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GrowthRing({ value }: { value: number }): JSX.Element {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <LiquidProgressRing
      value={clamped}
      caption={<span className="text-xs font-medium text-pl-slate">Growth pace</span>}
    />
  );
}
