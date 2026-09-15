import { Monitor, Moon, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useThemeStore, type ThemeMode } from '../../store/useThemeStore';

const OPTIONS: { mode: ThemeMode; icon: LucideIcon; label: string }[] = [
  { mode: 'system', icon: Monitor, label: 'Match system' },
  { mode: 'light', icon: Sun, label: 'Light' },
  { mode: 'dark', icon: Moon, label: 'Dark' },
];

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div className="flex rounded-lg border border-line bg-ink-soft p-1" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((opt) => (
        <button
          key={opt.mode}
          type="button"
          role="radio"
          aria-checked={mode === opt.mode}
          onClick={() => setMode(opt.mode)}
          title={opt.label}
          className={`flex flex-1 items-center justify-center rounded-md py-1.5 transition-colors ${
            mode === opt.mode ? 'bg-amber text-ink-on-parchment' : 'text-ink-muted hover:text-ink-bright'
          }`}
        >
          <opt.icon size={14} />
          <span className="sr-only">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
