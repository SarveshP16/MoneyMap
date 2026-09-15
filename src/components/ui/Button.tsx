import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-verdigris text-ink-on-parchment hover:brightness-110 font-semibold',
  outline: 'border border-line text-ink-bright hover:border-verdigris/50 hover:bg-panel',
  ghost: 'text-ink-muted hover:text-ink-bright hover:bg-panel',
  danger: 'text-coral hover:bg-coral-soft',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  icon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: ReactNode }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-panel-high hover:text-ink-bright ${className}`}
    >
      {children}
    </button>
  );
}
