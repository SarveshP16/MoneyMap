import {
  Compass,
  Receipt,
  PieChart,
  PiggyBank,
  TrendingUp,
  CalendarClock,
  Landmark,
  ShoppingBag,
  Building2,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: Compass },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/budgets', label: 'Budgets', icon: PieChart },
  { to: '/savings', label: 'Savings', icon: PiggyBank },
  { to: '/investments', label: 'Investments', icon: TrendingUp },
  { to: '/subscriptions', label: 'Subscriptions & bills', icon: CalendarClock },
  { to: '/purchases', label: 'Purchases & expenses', icon: ShoppingBag },
  { to: '/income', label: 'Income & tax', icon: Landmark },
  { to: '/banks', label: 'Banks', icon: Building2 },
];
