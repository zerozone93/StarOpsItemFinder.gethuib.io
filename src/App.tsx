import { HashRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { MainLayout } from './layouts/MainLayout';
import { Home } from './pages/Home';
import { Resources, ResourceDetail } from './pages/Resources';
import { Mining } from './pages/Mining';
import { Crafting } from './pages/Crafting';
import { Weapons, WeaponDetail } from './pages/Weapons';
import { Armor, ArmorDetail } from './pages/Armor';
import { Locations, LocationDetail } from './pages/Locations';

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/:slug" element={<ResourceDetail />} />
            <Route path="/mining" element={<Mining />} />
            <Route path="/crafting" element={<Crafting />} />
            <Route path="/weapons" element={<Weapons />} />
            <Route path="/weapons/:slug" element={<WeaponDetail />} />
            <Route path="/armor" element={<Armor />} />
            <Route path="/armor/:slug" element={<ArmorDetail />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/locations/:slug" element={<LocationDetail />} />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}
