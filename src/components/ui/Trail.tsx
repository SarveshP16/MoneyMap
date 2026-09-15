import { motion } from 'framer-motion';

type Tone = 'amber' | 'emerald' | 'coral';

const FILL: Record<Tone, string> = { amber: 'bg-amber', emerald: 'bg-emerald', coral: 'bg-coral' };

/** A route/trail-styled progress bar — a marker travels along the filled
 *  edge, echoing MoneyMap's wayfinding motif. Used for budget and savings
 *  goal progress, the two places "how far along" genuinely matters. */
export function Trail({ progress, tone = 'amber' }: { progress: number; tone?: Tone }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div className="relative h-1.5 w-full rounded-full bg-line/70">
      <motion.div
        className={`h-full rounded-full ${FILL[tone]}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
      />
      <motion.span
        className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-ink ${FILL[tone]}`}
        initial={{ left: 0 }}
        animate={{ left: `calc(${pct}% - 5px)` }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
      />
    </div>
  );
}
