import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CountUp } from './CountUp';

export function StatTile({
  icon: Icon,
  label,
  value,
  format,
  to,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  format: (n: number) => string;
  to?: string;
  tone?: 'default' | 'emerald' | 'coral';
}) {
  const navigate = useNavigate();
  const toneClasses =
    tone === 'emerald' ? 'text-emerald' : tone === 'coral' ? 'text-coral' : 'text-ink-bright';

  return (
    <motion.button
      type="button"
      onClick={to ? () => navigate(to) : undefined}
      whileHover={to ? { y: -2 } : undefined}
      whileTap={to ? { scale: 0.985 } : undefined}
      className={`flex flex-col gap-3 rounded-xl border border-line bg-panel p-4 text-left transition-colors ${
        to ? 'cursor-pointer hover:border-amber/40' : 'cursor-default'
      }`}
    >
      <div className="flex items-center gap-2 text-ink-muted">
        <Icon size={15} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`figure text-xl font-medium ${toneClasses}`}>
        <CountUp value={value} format={format} />
      </p>
    </motion.button>
  );
}
