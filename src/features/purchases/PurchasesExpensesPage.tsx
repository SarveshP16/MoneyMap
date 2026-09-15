import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Car, Plus, ShoppingBag, X } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { CountUp } from '../../components/ui/CountUp';
import { EmptyState } from '../../components/ui/EmptyState';
import { RankedBars } from '../../components/ui/RankedBars';
import { useFinanceStore } from '../../store/useFinanceStore';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { groupByLabel, groupByYear } from '../../lib/yearlyTotals';
import { carExpenseCategoryLabel, type CarExpense, type CarExpenseCategory, type Purchase } from '../../lib/types';
import { PurchaseRow } from './PurchaseRow';
import { PurchaseForm } from './PurchaseForm';
import { CarExpenseRow } from './CarExpenseRow';
import { CarExpenseForm } from './CarExpenseForm';

function yearOf(iso: string) {
  return new Date(iso).getFullYear();
}

export function PurchasesExpensesPage() {
  const purchases = useFinanceStore((s) => s.purchases);
  const carExpenses = useFinanceStore((s) => s.carExpenses);
  const currency = useFinanceStore((s) => currencyOf(s.currency));

  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | undefined>(undefined);
  const [carFormOpen, setCarFormOpen] = useState(false);
  const [editingCarExpense, setEditingCarExpense] = useState<CarExpense | undefined>(undefined);

  // Clicking a bar in "By year" / "By category" below sets these — each
  // section's total, its sibling breakdown, and its entry list all narrow
  // to match, so "filter" and "see the breakdown" are the same gesture.
  const [purchaseYear, setPurchaseYear] = useState<number | null>(null);
  const [carYear, setCarYear] = useState<number | null>(null);
  const [carCategory, setCarCategory] = useState<CarExpenseCategory | null>(null);

  const filteredPurchases = purchaseYear == null ? purchases : purchases.filter((p) => yearOf(p.date) === purchaseYear);
  const filteredCarExpenses = carExpenses.filter(
    (c) => (carYear == null || yearOf(c.date) === carYear) && (carCategory == null || c.category === carCategory),
  );

  const sortedPurchases = [...filteredPurchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedCarExpenses = [...filteredCarExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const purchasesTotal = filteredPurchases.reduce((s, p) => s + p.amount, 0);
  const carExpensesTotal = filteredCarExpenses.reduce((s, c) => s + c.amount, 0);

  // Purchases only have one dimension (year), so their breakdown is always
  // the full set. Car expenses have two, so each breakdown is computed
  // against whatever the *other* filter narrowed to — picking a category
  // updates the year bars to that category's totals, and vice versa —
  // rather than staying static once something's selected.
  const purchasesByYear = groupByYear(purchases, (p) => p.date, (p) => p.amount);
  const carExpensesByYear = groupByYear(
    carCategory == null ? carExpenses : carExpenses.filter((c) => c.category === carCategory),
    (c) => c.date,
    (c) => c.amount,
  );
  const carExpensesByCategory = groupByLabel(
    carYear == null ? carExpenses : carExpenses.filter((c) => yearOf(c.date) === carYear),
    (c) => carExpenseCategoryLabel[c.category],
    (c) => c.amount,
    (c) => c.category,
  );

  const purchaseFilterLabel = purchaseYear != null ? String(purchaseYear) : 'All time';
  const carFilterLabel =
    [carYear != null ? String(carYear) : null, carCategory ? carExpenseCategoryLabel[carCategory] : null]
      .filter(Boolean)
      .join(' · ') || 'All time';

  return (
    <div>
      <PageHeader title="Purchases & expenses" subtitle="Big purchases and car running costs, tracked over time" />

      <div className="flex flex-col gap-10 px-5 py-6 sm:px-8">
        {/* Purchases ------------------------------------------------- */}
        <section>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-amber" />
                <h2 className="font-display text-lg font-semibold text-ink-bright">Purchases</h2>
              </div>
              {purchases.length > 0 && (
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="figure text-3xl font-medium text-ink-bright">
                    <CountUp value={purchasesTotal} format={(n) => formatCurrency(n, currency)} />
                  </p>
                  <span className="text-xs text-ink-faint">{purchaseFilterLabel}</span>
                  {purchaseYear != null && (
                    <button
                      type="button"
                      onClick={() => setPurchaseYear(null)}
                      className="inline-flex items-center gap-1 text-xs text-amber hover:underline"
                    >
                      <X size={11} /> Clear filter
                    </button>
                  )}
                </div>
              )}
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
                <h3 className="mb-1 text-xs font-medium text-ink-muted">By year</h3>
                <p className="mb-3 text-[11px] text-ink-faint">Tap a year to filter</p>
                <RankedBars
                  rows={purchasesByYear.map((y) => ({ key: String(y.year), label: String(y.year), total: y.total }))}
                  selectedKey={purchaseYear != null ? String(purchaseYear) : null}
                  onSelect={(key) => setPurchaseYear((cur) => (cur === Number(key) ? null : Number(key)))}
                />
              </div>
              <div className="flex flex-col gap-2 lg:col-span-2">
                {sortedPurchases.length === 0 ? (
                  <EmptyState
                    icon={ShoppingBag}
                    title="No purchases in this filter"
                    description="Try a different year, or clear the filter to see everything."
                    action={
                      <Button variant="outline" onClick={() => setPurchaseYear(null)}>
                        Clear filter
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
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Car size={16} className="text-amber" />
                <h2 className="font-display text-lg font-semibold text-ink-bright">Car expenses</h2>
              </div>
              {carExpenses.length > 0 && (
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="figure text-3xl font-medium text-ink-bright">
                    <CountUp value={carExpensesTotal} format={(n) => formatCurrency(n, currency)} />
                  </p>
                  <span className="text-xs text-ink-faint">{carFilterLabel}</span>
                  {(carYear != null || carCategory != null) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCarYear(null);
                        setCarCategory(null);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-amber hover:underline"
                    >
                      <X size={11} /> Clear filter
                    </button>
                  )}
                </div>
              )}
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
                  <h3 className="mb-1 text-xs font-medium text-ink-muted">By year</h3>
                  <p className="mb-3 text-[11px] text-ink-faint">Tap a year to filter</p>
                  <RankedBars
                    rows={carExpensesByYear.map((y) => ({ key: String(y.year), label: String(y.year), total: y.total }))}
                    selectedKey={carYear != null ? String(carYear) : null}
                    onSelect={(key) => setCarYear((cur) => (cur === Number(key) ? null : Number(key)))}
                  />
                </div>
                <div className="rounded-xl border border-line bg-panel p-4">
                  <h3 className="mb-1 text-xs font-medium text-ink-muted">By category</h3>
                  <p className="mb-3 text-[11px] text-ink-faint">Tap a category to filter</p>
                  <RankedBars
                    rows={carExpensesByCategory}
                    selectedKey={carCategory}
                    onSelect={(key) => setCarCategory((cur) => (cur === key ? null : (key as CarExpenseCategory)))}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {sortedCarExpenses.length === 0 ? (
                  <EmptyState
                    icon={Car}
                    title="No car expenses in this filter"
                    description="Try a different year or category, or clear the filter to see everything."
                    action={
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCarYear(null);
                          setCarCategory(null);
                        }}
                      >
                        Clear filter
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
