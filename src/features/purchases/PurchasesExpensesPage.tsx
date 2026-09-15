import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Car, Filter, Plus, ShoppingBag, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button, IconButton } from '../../components/ui/Button';
import { CountUp } from '../../components/ui/CountUp';
import { EmptyState } from '../../components/ui/EmptyState';
import { RankedBars } from '../../components/ui/RankedBars';
import { useFinanceStore } from '../../store/useFinanceStore';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { groupByLabel, groupByYear } from '../../lib/yearlyTotals';
import {
  CAR_EXPENSE_CATEGORIES,
  carExpenseCategoryLabel,
  type CarExpense,
  type CarExpenseCategory,
  type Purchase,
} from '../../lib/types';
import { PurchaseRow } from './PurchaseRow';
import { PurchaseForm } from './PurchaseForm';
import { CarExpenseRow } from './CarExpenseRow';
import { CarExpenseForm } from './CarExpenseForm';

function yearOf(iso: string) {
  return new Date(iso).getFullYear();
}

const selectClasses =
  'rounded-lg border border-line bg-ink-soft px-2.5 py-2 text-xs text-ink-bright outline-none transition-colors focus:border-amber cursor-pointer';

function TotalCard({
  icon: Icon,
  label,
  value,
  currency,
  caption,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  currency: ReturnType<typeof currencyOf>;
  caption: string;
}) {
  return (
    <div className="flex-1 rounded-xl border border-line bg-panel p-5">
      <div className="flex items-center gap-2 text-ink-muted">
        <Icon size={15} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="figure mt-2 text-3xl font-medium text-ink-bright">
        <CountUp value={value} format={(n) => formatCurrency(n, currency)} />
      </p>
      <p className="mt-1 text-xs text-ink-faint">{caption}</p>
    </div>
  );
}

export function PurchasesExpensesPage() {
  const purchases = useFinanceStore((s) => s.purchases);
  const carExpenses = useFinanceStore((s) => s.carExpenses);
  const currency = useFinanceStore((s) => currencyOf(s.currency));

  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | undefined>(undefined);
  const [carFormOpen, setCarFormOpen] = useState(false);
  const [editingCarExpense, setEditingCarExpense] = useState<CarExpense | undefined>(undefined);

  // One filter, set from the top-right of the page, drives everything below
  // it: both totals, both breakdown panels, and both entry lists. Year
  // applies to both purchases and car expenses; category only means
  // anything for car expenses (purchases aren't categorized), so it's
  // simply ignored when filtering purchases.
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CarExpenseCategory | null>(null);
  const hasFilter = yearFilter != null || categoryFilter != null;

  const availableYears = [...new Set([...purchases.map((p) => yearOf(p.date)), ...carExpenses.map((c) => yearOf(c.date))])].sort(
    (a, b) => b - a,
  );

  const filteredPurchases = yearFilter == null ? purchases : purchases.filter((p) => yearOf(p.date) === yearFilter);
  const filteredCarExpenses = carExpenses.filter(
    (c) => (yearFilter == null || yearOf(c.date) === yearFilter) && (categoryFilter == null || c.category === categoryFilter),
  );

  const sortedPurchases = [...filteredPurchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedCarExpenses = [...filteredCarExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const purchasesTotal = filteredPurchases.reduce((s, p) => s + p.amount, 0);
  const carExpensesTotal = filteredCarExpenses.reduce((s, c) => s + c.amount, 0);

  // Breakdown panels stay informational (not click-to-filter) now that
  // there's an explicit filter control — each one cross-filters against
  // the *other* active dimension so it still answers "which years had Rego
  // costs?" / "what did 2026 go on?" without collapsing to a single bar
  // once its own dimension is already picked up top.
  const purchasesByYear = groupByYear(purchases, (p) => p.date, (p) => p.amount);
  const carExpensesByYear = groupByYear(
    categoryFilter == null ? carExpenses : carExpenses.filter((c) => c.category === categoryFilter),
    (c) => c.date,
    (c) => c.amount,
  );
  const carExpensesByCategory = groupByLabel(
    yearFilter == null ? carExpenses : carExpenses.filter((c) => yearOf(c.date) === yearFilter),
    (c) => carExpenseCategoryLabel[c.category],
    (c) => c.amount,
    (c) => c.category,
  );

  const purchasesCaption = yearFilter != null ? String(yearFilter) : 'All time';
  const carCaption =
    [yearFilter != null ? String(yearFilter) : null, categoryFilter ? carExpenseCategoryLabel[categoryFilter] : null]
      .filter(Boolean)
      .join(' · ') || 'All time';

  function clearFilters() {
    setYearFilter(null);
    setCategoryFilter(null);
  }

  const hasAnyData = purchases.length > 0 || carExpenses.length > 0;

  return (
    <div>
      <PageHeader
        title="Purchases & expenses"
        subtitle="Big purchases and car running costs, tracked over time"
        actions={
          hasAnyData ? (
            <div className="flex flex-wrap items-center gap-2">
              <Filter size={14} className="text-ink-faint" />
              <select
                aria-label="Filter by year"
                className={selectClasses}
                value={yearFilter ?? ''}
                onChange={(e) => setYearFilter(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by category (car expenses)"
                className={selectClasses}
                value={categoryFilter ?? ''}
                onChange={(e) => setCategoryFilter((e.target.value || null) as CarExpenseCategory | null)}
              >
                <option value="">All categories</option>
                {CAR_EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {carExpenseCategoryLabel[c]}
                  </option>
                ))}
              </select>
              {hasFilter && <IconButton onClick={clearFilters} aria-label="Clear filters" className="text-amber"><X size={16} /></IconButton>}
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-10 px-5 py-6 sm:px-8">
        {hasAnyData && (
          <div className="flex flex-col gap-4 sm:flex-row">
            <TotalCard icon={ShoppingBag} label="Total purchases" value={purchasesTotal} currency={currency} caption={purchasesCaption} />
            <TotalCard icon={Car} label="Total car expenses" value={carExpensesTotal} currency={currency} caption={carCaption} />
          </div>
        )}

        {/* Purchases ------------------------------------------------- */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-amber" />
              <h2 className="font-display text-lg font-semibold text-ink-bright">Purchases</h2>
            </div>
            <Button
              icon={<Plus size={16} />}
              onClick={() => {
                setEditingPurchase(undefined);
                setPurchaseFormOpen(true);
              }}
            >
              Add purchase
            </Button>
          </div>

          {purchases.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No purchases logged yet"
              description="Track a big-ticket purchase — furniture, electronics, anything worth keeping separate from everyday spending."
              action={
                <Button variant="outline" onClick={() => setPurchaseFormOpen(true)}>
                  Add a purchase
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-line bg-panel p-4 lg:col-span-1">
                <h3 className="mb-3 text-xs font-medium text-ink-muted">By year</h3>
                <RankedBars rows={purchasesByYear.map((y) => ({ key: String(y.year), label: String(y.year), total: y.total }))} />
              </div>
              <div className="flex flex-col gap-2 lg:col-span-2">
                {sortedPurchases.length === 0 ? (
                  <EmptyState
                    icon={ShoppingBag}
                    title="No purchases in this filter"
                    description="Try a different year, or clear the filter to see everything."
                    action={
                      <Button variant="outline" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <AnimatePresence>
                    {sortedPurchases.map((p) => (
                      <PurchaseRow
                        key={p.id}
                        purchase={p}
                        onClick={() => {
                          setEditingPurchase(p);
                          setPurchaseFormOpen(true);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Car expenses ------------------------------------------------- */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car size={16} className="text-amber" />
              <h2 className="font-display text-lg font-semibold text-ink-bright">Car expenses</h2>
            </div>
            <Button
              icon={<Plus size={16} />}
              onClick={() => {
                setEditingCarExpense(undefined);
                setCarFormOpen(true);
              }}
            >
              Add expense
            </Button>
          </div>

          {carExpenses.length === 0 ? (
            <EmptyState
              icon={Car}
              title="No car expenses logged yet"
              description="Track rego, services, and parts to see what your car actually costs over time."
              action={
                <Button variant="outline" onClick={() => setCarFormOpen(true)}>
                  Add a car expense
                </Button>
              }
            />
          ) : (
            <>
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-panel p-4">
                  <h3 className="mb-3 text-xs font-medium text-ink-muted">By year</h3>
                  <RankedBars rows={carExpensesByYear.map((y) => ({ key: String(y.year), label: String(y.year), total: y.total }))} />
                </div>
                <div className="rounded-xl border border-line bg-panel p-4">
                  <h3 className="mb-3 text-xs font-medium text-ink-muted">By category</h3>
                  <RankedBars rows={carExpensesByCategory} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {sortedCarExpenses.length === 0 ? (
                  <EmptyState
                    icon={Car}
                    title="No car expenses in this filter"
                    description="Try a different year or category, or clear the filter to see everything."
                    action={
                      <Button variant="outline" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <AnimatePresence>
                    {sortedCarExpenses.map((c) => (
                      <CarExpenseRow
                        key={c.id}
                        carExpense={c}
                        onClick={() => {
                          setEditingCarExpense(c);
                          setCarFormOpen(true);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <PurchaseForm key={editingPurchase?.id ?? 'new-purchase'} open={purchaseFormOpen} onClose={() => setPurchaseFormOpen(false)} purchase={editingPurchase} />
      <CarExpenseForm key={editingCarExpense?.id ?? 'new-car-expense'} open={carFormOpen} onClose={() => setCarFormOpen(false)} carExpense={editingCarExpense} />
    </div>
  );
}
