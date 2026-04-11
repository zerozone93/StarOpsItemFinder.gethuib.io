import { Link, NavLink, Outlet } from 'react-router-dom';
import { AssistantPanel } from '../features/assistant/AssistantPanel';

const links = [
  ['/', 'Home'],
  ['/resources', 'Resources'],
  ['/mining', 'Mining'],
  ['/crafting', 'Crafting'],
  ['/weapons', 'Weapons'],
  ['/armor', 'Armor'],
  ['/locations', 'Locations'],
];

export function AppShell() {
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-kicker">STAR OPS</span>
          <strong>Item Finder</strong>
        </Link>
        <nav className="nav">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="main-layout">
        <Outlet />
      </main>
      <AssistantPanel />
    </div>
  );
}
