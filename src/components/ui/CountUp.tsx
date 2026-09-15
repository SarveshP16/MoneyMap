import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/** Animates a monetary figure counting up/down to `value` on change —
 *  MoneyMap's one orchestrated load moment for the hero number, and a
 *  quiet nod to state changes elsewhere (a stat tile updating after an
 *  edit). Renders a MotionValue directly so it updates without re-render. */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 24, mass: 0.7 });
  const display = useTransform(spring, (v) => format(v));

  useEffect(() => {
    motionValue.set(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <motion.span>{display}</motion.span>;
}
