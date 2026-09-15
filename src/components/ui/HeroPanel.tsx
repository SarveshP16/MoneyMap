import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { CountUp } from './CountUp';

export function HeroPanel({
  label,
  value,
  format,
  trend,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  trend: number[];
}) {
  const data = trend.map((v, i) => ({ i, v }));

  return (
    <div className="contour-texture relative overflow-hidden rounded-2xl bg-parchment px-6 py-7 sm:px-8 sm:py-8">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-on-parchment/55">{label}</p>
      <p className="figure mt-2 text-4xl font-medium text-ink-on-parchment sm:text-5xl">
        <CountUp value={value} format={format} />
      </p>

      <div className="mt-5 h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="heroTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#241f14" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#241f14" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke="#241f14"
              strokeWidth={1.75}
              fill="url(#heroTrend)"
              isAnimationActive
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1.5 text-[11px] text-ink-on-parchment/45">Last 8 weeks</p>
    </div>
  );
}
