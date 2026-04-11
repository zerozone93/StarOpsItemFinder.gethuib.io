import { Link } from 'react-router-dom';
import { SectionHeader } from '../components/SectionHeader';
import { SearchBar } from '../components/SearchBar';
import { StatCard } from '../components/StatCard';
import { useData } from '../App';
import { useMemo, useState } from 'react';
import { buildSearchIndex, entityPath, stringifyForSearch } from '../utils/data';

export function HomePage() {
  const data = useData();
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return buildSearchIndex(data)
      .filter((item) => stringifyForSearch(item as unknown as Record<string, unknown>).includes(query.toLowerCase()))
      .slice(0, 8);
  }, [data, query]);

  return (
    <div className="page-grid">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Operations database</p>
          <h1>Star Ops Item Finder</h1>
          <p className="hero-copy">
            A clean Star Citizen reference for mining, crafting, weapons, armor, vendors, tools, and locations.
          </p>
        </div>
        <div>
          <SearchBar value={query} onChange={setQuery} placeholder="Search Hadanite, ROC, CenterMass, Lorville…" />
          {results.length > 0 ? (
            <div className="result-list panel-subtle">
              {results.map((item) => (
                <Link key={`${item.entityType}-${item.id}`} to={entityPath(item.entityType, item.id)} className="result-link">
                  <strong>{'name' in item ? item.name : item.id}</strong>
                  <span>{item.entityType}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Resources" value={data.resources.length}>Mining and crafting inputs</StatCard>
        <StatCard label="Weapons" value={data.weapons.length}>Shops, loot, and crafting paths</StatCard>
        <StatCard label="Armor" value={data.armor.length}>Armor classes and obtain methods</StatCard>
        <StatCard label="Locations" value={data.locations.length}>Cities, moons, caves, and outposts</StatCard>
      </section>

      <section>
        <SectionHeader title="Quick access" description="Jump into the core sections of the app." />
        <div className="stats-grid">
          {[
            ['/resources', 'Resources'],
            ['/mining', 'Mining'],
            ['/crafting', 'Crafting'],
            ['/weapons', 'Weapons'],
            ['/armor', 'Armor'],
            ['/locations', 'Locations'],
          ].map(([to, label]) => (
            <Link key={to} to={to} className="panel quick-link">
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
