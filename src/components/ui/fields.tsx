import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

const inputClasses =
  'w-full rounded-lg border border-line bg-ink-soft px-3 py-2.5 text-sm text-ink-bright placeholder:text-ink-faint outline-none transition-colors focus:border-amber';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClasses} ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClasses} resize-none ${props.className ?? ''}`} />;
}

export function AmountInput({
  symbol,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { symbol: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
        {symbol}
      </span>
      <input
        {...props}
        type="text"
        inputMode="decimal"
        className={`${inputClasses} pl-8 figure-sans ${props.className ?? ''}`}
      />
    </div>
  );
}

export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="date"
      className={`${inputClasses} figure-sans ${props.className ?? ''}`}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  labels,
  onChange,
}: {
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-line bg-ink-soft p-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            value === opt ? 'bg-amber text-ink-on-parchment' : 'text-ink-muted hover:text-ink-bright'
          }`}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-ink-soft px-3 py-2.5 text-left"
    >
      <span>
        <span className="block text-sm text-ink-bright">{label}</span>
        {description && <span className="block text-xs text-ink-faint">{description}</span>}
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-amber' : 'bg-line'}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-ink transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

export function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClasses} cursor-pointer`}
    >
      {children}
    </select>
  );
}
