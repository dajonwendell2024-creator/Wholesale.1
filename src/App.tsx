import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import LeadsPage from './pages/LeadsPage';
import PipelinePage from './pages/PipelinePage';
import BuyersPage from './pages/BuyersPage';
import AgentsPage from './pages/AgentsPage';
import SettingsPage from './pages/SettingsPage';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'leads', label: 'Leads' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'buyers', label: 'Buyers' },
  { id: 'agents', label: 'Agents' },
  { id: 'settings', label: 'Settings / Phase 2' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const [tab, setTab] = useState<TabId>('dashboard');

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand">Wholesale Command Center</div>
          <div className="tagline">
            Phase 1 — your stack, your data. Lead Inbox stays the ops tool until cutover.
          </div>
        </div>
        <div className="rule-badges">
          <span className="badge badge-gate">Approval gate: ON</span>
          <span className="badge badge-gate">DNC gate: ON</span>
          <span className="badge badge-never">AI calling: never</span>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'dashboard' && <Dashboard go={(t) => setTab(t as TabId)} />}
        {tab === 'leads' && <LeadsPage />}
        {tab === 'pipeline' && <PipelinePage />}
        {tab === 'buyers' && <BuyersPage />}
        {tab === 'agents' && <AgentsPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>

      <footer className="footer">
        Seed data is real but UNVERIFIED public-record data (bucket + Craigslist buyer files,
        Oct 2026). Nothing in Phase 1 sends messages or places calls.
      </footer>
    </div>
  );
}
