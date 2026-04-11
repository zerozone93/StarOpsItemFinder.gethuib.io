import { useMemo, useState } from 'react';
import { useData } from '../App';
import { SearchBar } from '../components/SearchBar';
import { SectionHeader } from '../components/SectionHeader';
import { EntityCard } from '../components/EntityCard';

export function WeaponsPage() {
  const data = useData();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => data.weapons.filter((w) => JSON.stringify(w).toLowerCase().includes(query.toLowerCase())), [data, query]);
  return (
    <div className="page-grid">
      <SectionHeader title="Weapons" description="Personal weapons, where to get them, and how they connect to crafting." />
      <SearchBar value={query} onChange={setQuery} placeholder="Search weapons, vendors, damage type" />
      <div className="cards-grid">
        {filtered.map((weapon) => (
          <EntityCard
            key={weapon.id}
            type="weapon"
            id={weapon.id}
            title={weapon.name}
            subtitle={weapon.damageType}
            meta={[weapon.class ?? 'weapon', ...(weapon.obtainMethods ?? []).map((m) => m.type).slice(0, 2)]}
            verification={weapon.verificationStatus}
          />
        ))}
      </div>
    </div>
  );
}
