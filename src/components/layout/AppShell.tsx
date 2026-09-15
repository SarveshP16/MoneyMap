import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Logo } from './Logo';
import { Toaster } from '../Toaster';

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-dvh bg-ink text-ink-bright">
      <Sidebar />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="text-ink-muted hover:text-ink-bright"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <Logo size={18} />
          <span className="font-display text-base font-semibold text-ink-bright">MoneyMap</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <Toaster />
    </div>
  );
}
