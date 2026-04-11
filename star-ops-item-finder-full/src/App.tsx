import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { ResourcesPage } from './pages/ResourcesPage';
import { MiningPage } from './pages/MiningPage';
import { CraftingPage } from './pages/CraftingPage';
import { WeaponsPage } from './pages/WeaponsPage';
import { ArmorPage } from './pages/ArmorPage';
import { LocationsPage } from './pages/LocationsPage';
import { EntityPage } from './pages/EntityPage';
import { loadData } from './utils/data';
import { MasterData } from './types/data';

const DataContext = createContext<MasterData | null>(null);

export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error('Data context missing');
  return value;
}

function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MasterData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData().then(setData).catch((err: Error) => setError(err.message));
  }, []);

  const value = useMemo(() => data, [data]);

  if (error) return <div className="screen-state">Failed to load data: {error}</div>;
  if (!value) return <div className="screen-state">Loading Star Ops database…</div>;

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export default function App() {
  return (
    <DataProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/mining" element={<MiningPage />} />
          <Route path="/crafting" element={<CraftingPage />} />
          <Route path="/weapons" element={<WeaponsPage />} />
          <Route path="/armor" element={<ArmorPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/entity/:type/:id" element={<EntityPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}
