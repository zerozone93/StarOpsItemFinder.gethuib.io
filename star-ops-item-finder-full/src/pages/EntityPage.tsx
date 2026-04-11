import { Link, useParams } from 'react-router-dom';
import { useData } from '../App';
import { SectionHeader } from '../components/SectionHeader';
import { entityPath, getLocationName, getResourceName, getStoreName, getToolName, recipeLabel } from '../utils/data';
import { Armor, Recipe, Resource, Weapon } from '../types/data';

export function EntityPage() {
  const { type = '', id = '' } = useParams();
  const data = useData();

  const collectionMap = {
    resource: data.resources,
    weapon: data.weapons,
    armor: data.armor,
    store: data.stores,
    location: data.locations,
    blueprint: data.crafting.blueprints,
    recipe: data.crafting.recipes,
    tool: data.toolsAndVehicles,
    mining: data.miningMethods,
  } as const;

  const entity = collectionMap[type as keyof typeof collectionMap]?.find((item) => item.id === id);

  if (!entity) return <div className="screen-state">Entity not found.</div>;

  const related: { label: string; to: string }[] = [];

  if (type === 'resource') {
    const resource = entity as Resource;
    for (const locationId of resource.knownLocations ?? []) related.push({ label: getLocationName(data, locationId), to: entityPath('location', locationId) });
    for (const toolId of resource.requiredToolOrVehicleIds ?? []) related.push({ label: getToolName(data, toolId), to: entityPath('tool', toolId) });
  }

  if (type === 'weapon' || type === 'armor') {
    const gear = entity as Weapon | Armor;
    for (const method of gear.obtainMethods ?? []) {
      for (const storeId of method.storeIds ?? []) related.push({ label: getStoreName(data, storeId), to: entityPath('store', storeId) });
    }
  }

  if (type === 'recipe') {
    const recipe = entity as Recipe;
    if (recipe.outputItemId) related.push({ label: recipeLabel(recipe, data), to: entityPath(data.weapons.some((w) => w.id === recipe.outputItemId) ? 'weapon' : 'armor', recipe.outputItemId) });
    for (const ingredient of recipe.ingredients ?? []) related.push({ label: getResourceName(data, ingredient.resourceId), to: entityPath('resource', ingredient.resourceId) });
  }

  return (
    <div className="page-grid">
      <SectionHeader title={'name' in entity ? entity.name : entity.id} description={`Detail view for ${type}.`} />
      <section className="panel detail-panel">
        <pre className="detail-pre">{JSON.stringify(entity, null, 2)}</pre>
      </section>
      {related.length ? (
        <section className="panel detail-panel">
          <h2>Related records</h2>
          <div className="chip-row">
            {related.map((item) => (
              <Link key={`${item.to}-${item.label}`} to={item.to} className="chip link-chip">
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
