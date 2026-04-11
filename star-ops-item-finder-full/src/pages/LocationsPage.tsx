import { useMemo, useState } from 'react';
import { useData } from '../App';
import { SearchBar } from '../components/SearchBar';
import { SectionHeader } from '../components/SectionHeader';
import { EntityCard } from '../components/EntityCard';

export function LocationsPage() {
  const data = useData();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => data.locations.filter((l) => JSON.stringify(l).toLowerCase().includes(query.toLowerCase())), [data, query]);
  return (
    <div className="page-grid">
      <SectionHeader title="Locations" description="Cities, moons, caves, and other points of interest." />
      <SearchBar value={query} onChange={setQuery} placeholder="Search Area18, Daymar, Aberdeen…" />
      <div className="cards-grid">
        {filtered.map((location) => (
          <EntityCard
            key={location.id}
            type="location"
            id={location.id}
            title={location.name}
            subtitle={location.parent}
            meta={[location.locationType ?? 'location', location.systemId ?? 'unknown system']}
          />
        ))}
      </div>
    </div>
  );
}
