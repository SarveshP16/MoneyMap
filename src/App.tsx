import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { OverviewPage } from './features/overview/OverviewPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { OwedToYouPage } from './features/transactions/OwedToYouPage';
import { BudgetsPage } from './features/budgets/BudgetsPage';
import { SavingsPage } from './features/savings/SavingsPage';
import { InvestmentsPage } from './features/investments/InvestmentsPage';
import { SubscriptionsPage } from './features/subscriptions/SubscriptionsPage';
import { IncomePage } from './features/income/IncomePage';

export default function App() {
  return (
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
          <Route path="income" element={<IncomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
