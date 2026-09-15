import { useMemo } from 'react';
import { Landmark, PiggyBank, Receipt, RefreshCw, TrendingUp, Wallet2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { HeroPanel } from '../../components/ui/HeroPanel';
import { StatTile } from '../../components/ui/StatTile';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFinanceStore } from '../../store/useFinanceStore';
import { formatCurrency, currencyOf } from '../../lib/currency';
import { applyTransactionFilter, isFilterActive } from '../../lib/transactionFiltering';
import { totalOwedToYou, totalSpent, totalSavings, totalInvestmentsValue, monthlyTotal, totalIncomeForCurrentFinancialYear } from '../../lib/financeTotals';
import { TransactionRow } from '../transactions/TransactionRow';
import { TopCategories } from './TopCategories';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export function OverviewPage() {
  const navigate = useNavigate();
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const transactions = useFinanceStore((s) => s.transactions);
  const categories = useFinanceStore((s) => s.categories);
  const paymentMethods = useFinanceStore((s) => s.paymentMethods);
  const filter = useFinanceStore((s) => s.filter);
  const clearFilter = useFinanceStore((s) => s.clearFilter);
  const savingsGoals = useFinanceStore((s) => s.savingsGoals);
  const investments = useFinanceStore((s) => s.investments);
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const incomeRecords = useFinanceStore((s) => s.incomeRecords);

  const filtered = useMemo(() => applyTransactionFilter(transactions, filter), [transactions, filter]);
  const filterActive = isFilterActive(filter);
  const spent = totalSpent(filtered);
  const owed = totalOwedToYou(filtered);
  const fmt = (n: number) => formatCurrency(n, currency);

  // 8-week spend trend, oldest to newest, for the hero sparkline.
  const trend = useMemo(() => {
    const now = new Date();
    const weeks: number[] = [];
    for (let w = 7; w >= 0; w--) {
      const end = new Date(now);
      end.setDate(end.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const sum = filtered
        .filter((t) => {
          const d = new Date(t.date);
          return d >= start && d <= end;
        })
        .reduce((s, t) => s + t.amount, 0);
      weeks.push(sum);
    }
    return weeks;
  }, [filtered]);

  const recent = filtered.slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Where your money's been, at a glance"
        actions={
          <Button icon={<Receipt size={16} />} onClick={() => navigate('/transactions')}>
            Add expense
          </Button>
        }
      />

      <div className="px-5 py-6 sm:px-8">
        {filterActive && (
          <div className="mb-5 flex items-center justify-between rounded-lg border border-verdigris/30 bg-verdigris-soft/40 px-4 py-2.5 text-sm text-ink-bright">
            <span>Totals reflect the active filter</span>
            <button onClick={clearFilter} className="font-medium text-verdigris hover:text-verdigris/80">
              Clear filter
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <HeroPanel
              label={filterActive ? 'Spent (filtered)' : 'Total spent'}
              value={spent}
              format={fmt}
              trend={trend}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <StatTile
              icon={Wallet2}
              label={filterActive ? 'Owed to you (filtered)' : 'Owed to you'}
              value={owed}
              format={fmt}
              tone="emerald"
              to="/owed"
            />
            <StatTile
              icon={Landmark}
              label={currency.isAustralian ? 'Income (this FY)' : 'Income (this year)'}
              value={totalIncomeForCurrentFinancialYear(incomeRecords, currency.isAustralian)}
              format={fmt}
              tone="emerald"
              to="/income"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile icon={TrendingUp} label="Investments" value={totalInvestmentsValue(investments)} format={fmt} to="/investments" />
          <StatTile icon={PiggyBank} label="Savings" value={totalSavings(savingsGoals)} format={fmt} to="/savings" />
          <StatTile
            icon={RefreshCw}
            label="Subscriptions & bills / mo"
            value={monthlyTotal(subscriptions)}
            format={fmt}
            tone="brass"
            to="/subscriptions"
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopCategories transactions={filtered} categories={categories} />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink-bright">Recent activity</h2>
              <button onClick={() => navigate('/transactions')} className="text-sm text-verdigris hover:text-verdigris/80">
                View all
              </button>
            </div>

            {recent.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No expenses yet"
                description="Log your first expense to start seeing it charted here."
                action={
                  <Button variant="outline" onClick={() => navigate('/transactions')}>
                    Add an expense
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-2">
                {recent.map((t) => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    categoryName={categories.find((c) => c.id === t.categoryId)?.name}
                    paymentMethodName={paymentMethods.find((m) => m.id === t.paymentMethodId)?.name}
                    onClick={() => navigate('/transactions')}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
