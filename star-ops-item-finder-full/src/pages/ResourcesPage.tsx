import { useMemo, useState } from 'react';
import { useData } from '../App';
import { EntityCard } from '../components/EntityCard';
import { SearchBar } from '../components/SearchBar';
import { SectionHeader } from '../components/SectionHeader';
import { getLocationName, getToolName } from '../utils/data';

export function ResourcesPage() {
  const data = useData();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => data.resources.filter((r) => JSON.stringify(r).toLowerCase().includes(query.toLowerCase())), [data, query]);

  return (
    <div className="page-grid">
      <SectionHeader title="Resources" description="See where materials are found and what is needed to gather them." />
      <SearchBar value={query} onChange={setQuery} placeholder="Search resources, tools, or moons" />
      <div className="cards-grid">
        {filtered.map((resource) => (
          <EntityCard
            key={resource.id}
            type="resource"
            id={resource.id}
            title={resource.name}
            subtitle={resource.locationNotes}
            meta={[
              ...(resource.miningMethods ?? []),
              ...(resource.knownLocations ?? []).slice(0, 2).map((id) => getLocationName(data, id)),
              ...(resource.requiredToolOrVehicleIds ?? []).slice(0, 2).map((id) => getToolName(data, id)),
            ]}
            verification={resource.verificationStatus}
          />
        ))}
      </div>
    </div>
  );
}
