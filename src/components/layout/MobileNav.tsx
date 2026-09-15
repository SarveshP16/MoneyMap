import { AnimatePresence, motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { Logo } from './Logo';
import { NAV_ITEMS } from './nav';
import { CurrencyPicker } from '../ui/CurrencyPicker';
import { DataBackup } from '../ui/DataBackup';
import { SyncStatusIndicator } from '../ui/SyncStatusIndicator';
import { ThemeToggle } from '../ui/ThemeToggle';

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-ink-soft lg:hidden"
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-6">
              <div className="flex items-center gap-2.5">
                <Logo />
                <span className="font-display text-lg font-semibold text-ink-bright">MoneyMap</span>
              </div>
              <button onClick={onClose} className="text-ink-muted hover:text-ink-bright" aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-4">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm ${
                      isActive
                        ? 'border-verdigris bg-panel text-ink-bright'
                        : 'border-transparent text-ink-muted'
                    }`
                  }
                >
                  <item.icon size={17} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex flex-col gap-2 p-3">
              <SyncStatusIndicator />
              <ThemeToggle />
              <CurrencyPicker />
              <DataBackup />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
