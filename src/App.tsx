import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthGate } from './components/AuthGate';
import { ConnectionGate } from './components/ConnectionGate';
import { ProfileGate } from './components/ProfileGate';
import { useApplyTheme } from './store/useApplyTheme';
import { useServiceWorker } from './store/useServiceWorker';
import { useNotifications } from './store/useNotifications';
import { OverviewPage } from './features/overview/OverviewPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { OwedToYouPage } from './features/transactions/OwedToYouPage';
import { BudgetsPage } from './features/budgets/BudgetsPage';
import { SavingsPage } from './features/savings/SavingsPage';
import { InvestmentsPage } from './features/investments/InvestmentsPage';
import { SubscriptionsPage } from './features/subscriptions/SubscriptionsPage';
import { PurchasesExpensesPage } from './features/purchases/PurchasesExpensesPage';
import { IncomePage } from './features/income/IncomePage';
import { BanksPage } from './features/banks/BanksPage';

export default function App() {
  useApplyTheme();
  useServiceWorker();
  useNotifications();

  return (
    <AuthGate>
      <ProfileGate>
        <ConnectionGate>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<OverviewPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="owed" element={<OwedToYouPage />} />
                <Route path="budgets" element={<BudgetsPage />} />
                <Route path="savings" element={<SavingsPage />} />
                <Route path="investments" element={<InvestmentsPage />} />
                <Route path="subscriptions" element={<SubscriptionsPage />} />
                <Route path="purchases" element={<PurchasesExpensesPage />} />
                <Route path="income" element={<IncomePage />} />
                <Route path="banks" element={<BanksPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ConnectionGate>
      </ProfileGate>
    </AuthGate>
  );
}
