import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Car, Plus, ShoppingBag } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { RankedBars } from '../../components/ui/RankedBars';
import { useFinanceStore } from '../../store/useFinanceStore';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { groupByLabel, groupByYear } from '../../lib/yearlyTotals';
import { carExpenseCategoryLabel, type CarExpense, type Purchase } from '../../lib/types';
import { PurchaseRow } from './PurchaseRow';
import { PurchaseForm } from './PurchaseForm';
import { CarExpenseRow } from './CarExpenseRow';
import { CarExpenseForm } from './CarExpenseForm';

export function PurchasesExpensesPage() {
  const purchases = useFinanceStore((s) => s.purchases);
  const carExpenses = useFinanceStore((s) => s.carExpenses);
  const currency = useFinanceStore((s) => currencyOf(s.currency));

  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | undefined>(undefined);
  const [carFormOpen, setCarFormOpen] = useState(false);
  const [editingCarExpense, setEditingCarExpense] = useState<CarExpense | undefined>(undefined);

  const sortedPurchases = [...purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedCarExpenses = [...carExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const purchasesTotal = purchases.reduce((s, p) => s + p.amount, 0);
  const carExpensesTotal = carExpenses.reduce((s, c) => s + c.amount, 0);

  const purchasesByYear = groupByYear(purchases, (p) => p.date, (p) => p.amount);
  const carExpensesByYear = groupByYear(carExpenses, (c) => c.date, (c) => c.amount);
  const carExpensesByCategory = groupByLabel(carExpenses, (c) => carExpenseCategoryLabel[c.category], (c) => c.amount);

  return (
    <div>
      <PageHeader title="Purchases & expenses" subtitle="Big purchases and car running costs, tracked over time" />

      <div className="flex flex-col gap-10 px-5 py-6 sm:px-8">
        {/* Purchases ------------------------------------------------- */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-amber" />
              <h2 className="font-display text-lg font-semibold text-ink-bright">Purchases</h2>
              {purchases.length > 0 && (
                <span className="figure-sans text-sm text-ink-muted">{formatCurrency(purchasesTotal, currency)}</span>
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
                <h3 className="mb-3 text-xs font-medium text-ink-muted">By year</h3>
                <RankedBars rows={purchasesByYear.map((y) => ({ label: String(y.year), total: y.total }))} />
              </div>
              <div className="flex flex-col gap-2 lg:col-span-2">
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
              {carExpenses.length > 0 && (
                <span className="figure-sans text-sm text-ink-muted">{formatCurrency(carExpensesTotal, currency)}</span>
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
                  <h3 className="mb-3 text-xs font-medium text-ink-muted">By year</h3>
                  <RankedBars rows={carExpensesByYear.map((y) => ({ label: String(y.year), total: y.total }))} />
                </div>
                <div className="rounded-xl border border-line bg-panel p-4">
                  <h3 className="mb-3 text-xs font-medium text-ink-muted">By category</h3>
                  <RankedBars rows={carExpensesByCategory} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
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
