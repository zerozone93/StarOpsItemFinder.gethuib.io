import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { AssistantPanel } from '../features/assistant/components/AssistantPanel';
import styles from './MainLayout.module.css';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/resources', label: 'Resources', end: false },
  { to: '/mining', label: 'Mining', end: false },
  { to: '/crafting', label: 'Crafting', end: false },
  { to: '/weapons', label: 'Weapons', end: false },
  { to: '/armor', label: 'Armor', end: false },
  { to: '/locations', label: 'Locations', end: false },
];

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <NavLink to="/" className={styles.logo} end>
            <span className={styles.logoIcon}>⚡</span>
            Star Ops Item Finder
          </NavLink>
          <div className={styles.navLinks}>
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <button
            className={styles.mobileMenu}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
        <div className={`${styles.mobileNav} ${mobileOpen ? styles.mobileNavOpen : ''}`}>
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p>Star Ops Item Finder — Community resource for Star Citizen</p>
          <p style={{ marginTop: 4 }}>
            Not affiliated with Cloud Imperium Games. Star Citizen® is a registered trademark of Cloud Imperium Games Corp.
          </p>
        </div>
      </footer>

      <AssistantPanel />
    </div>
  );
}
