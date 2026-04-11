import { useMemo, useState } from 'react';
import { useData } from '../App';
import { SearchBar } from '../components/SearchBar';
import { SectionHeader } from '../components/SectionHeader';
import { EntityCard } from '../components/EntityCard';

export function ArmorPage() {
  const data = useData();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => data.armor.filter((a) => JSON.stringify(a).toLowerCase().includes(query.toLowerCase())), [data, query]);
  return (
    <div className="page-grid">
      <SectionHeader title="Armor" description="Armor classes, manufacturer data, and obtain methods." />
      <SearchBar value={query} onChange={setQuery} placeholder="Search armor, class, manufacturer" />
      <div className="cards-grid">
        {filtered.map((armor) => (
          <EntityCard
            key={armor.id}
            type="armor"
            id={armor.id}
            title={armor.name}
            subtitle={armor.manufacturer}
            meta={[armor.class ?? 'armor', ...(armor.recommendedFor ?? []).slice(0, 2)]}
            verification={armor.verificationStatus}
          />
        ))}
      </div>
    </div>
  );
}
