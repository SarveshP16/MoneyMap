import { NavLink } from 'react-router-dom';
import { Logo } from './Logo';
import { NAV_ITEMS } from './nav';
import { CurrencyPicker } from '../ui/CurrencyPicker';
import { DataBackup } from '../ui/DataBackup';
import { NotificationToggle } from '../ui/NotificationToggle';
import { ProfileSwitcher } from '../ui/ProfileSwitcher';
import { SyncStatusIndicator } from '../ui/SyncStatusIndicator';
import { ThemeToggle } from '../ui/ThemeToggle';

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-ink-soft lg:flex">
      <div className="flex items-center gap-2.5 px-5 pb-2 pt-6">
        <Logo />
        <span className="font-display text-lg font-semibold tracking-tight text-ink-bright">
          MoneyMap
        </span>
      </div>
      <p className="px-5 pb-5 text-xs text-ink-faint">Where your money goes, charted.</p>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'border-verdigris bg-panel text-ink-bright'
                  : 'border-transparent text-ink-muted hover:border-line hover:bg-panel/60 hover:text-ink-bright'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={17} className={isActive ? 'text-verdigris' : 'text-ink-faint group-hover:text-ink-muted'} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col gap-2 p-3">
        <SyncStatusIndicator />
        <ProfileSwitcher />
        <NotificationToggle />
        <ThemeToggle />
        <CurrencyPicker />
        <DataBackup />
      </div>
    </aside>
  );
}
