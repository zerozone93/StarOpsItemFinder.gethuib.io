import { useData } from '../App';
import { SectionHeader } from '../components/SectionHeader';
import { EntityCard } from '../components/EntityCard';

export function MiningPage() {
  const data = useData();
  const supportedResources = (methodId: string) => data.resources.filter((r) => r.miningMethods?.includes(methodId)).map((r) => r.name);

  return (
    <div className="page-grid">
      <SectionHeader title="Mining Guide" description="FPS, ROC, and ship mining references in one place." />
      <div className="cards-grid">
        {data.miningMethods.map((method) => (
          <EntityCard
            key={method.id}
            type="mining"
            id={method.id}
            title={method.name}
            subtitle={method.description}
            meta={supportedResources(method.id).slice(0, 4)}
          />
        ))}
      </div>
      <SectionHeader title="Tools and vehicles" description="Core gear used across the mining loop." />
      <div className="cards-grid">
        {data.toolsAndVehicles.map((item) => (
          <EntityCard
            key={item.id}
            type="tool"
            id={item.id}
            title={item.name}
            subtitle={item.manufacturer}
            meta={[item.kind ?? 'gear', ...(item.roles ?? []).slice(0, 3)]}
            verification={item.verificationStatus}
          />
        ))}
      </div>
    </div>
  );
}
