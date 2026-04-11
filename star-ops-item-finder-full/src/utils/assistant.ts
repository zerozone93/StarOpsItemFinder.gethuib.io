import { MasterData } from '../types/data';
import { entityPath, getLocationName, getResourceName, getStoreName, getToolName } from './data';

const contains = (text: string, q: string) => text.toLowerCase().includes(q.toLowerCase());

export function answerQuestion(question: string, data: MasterData) {
  const q = question.toLowerCase();

  for (const resource of data.resources) {
    if (contains(q, resource.name.toLowerCase())) {
      const locations = (resource.knownLocations ?? []).map((id) => getLocationName(data, id));
      const tools = (resource.requiredToolOrVehicleIds ?? []).map((id) => getToolName(data, id));
      return {
        answer: `${resource.name} can be found at ${locations.join(', ') || 'unknown locations'}. You typically need ${tools.join(', ') || 'the right mining gear'} to gather it. ${resource.locationNotes ?? ''}`.trim(),
        links: [
          { label: resource.name, to: entityPath('resource', resource.id) },
          ...(resource.knownLocations ?? []).slice(0, 3).map((id) => ({ label: getLocationName(data, id), to: entityPath('location', id) })),
        ],
      };
    }
  }

  if (q.includes('roc')) {
    const roc = data.toolsAndVehicles.find((item) => item.id.includes('roc'));
    const rocResources = data.resources.filter((item) => item.miningMethods?.includes('roc_mining')).slice(0, 6);
    return {
      answer: `${roc?.name ?? 'Greycat ROC'} is the main vehicle for ROC mining. It is best for gem and small-node resource runs like ${rocResources.map((item) => item.name).join(', ')}.`,
      links: [{ label: roc?.name ?? 'ROC', to: entityPath('tool', roc?.id ?? 'greycat_roc') }],
    };
  }

  if (q.includes('weapon') && (q.includes('buy') || q.includes('sold') || q.includes('area18'))) {
    const weapons = data.weapons.filter((w) => w.obtainMethods?.some((m) => m.type === 'vendor')).slice(0, 4);
    return {
      answer: `Vendor-sold personal weapons in the sample dataset include ${weapons.map((w) => w.name).join(', ')}. CenterMass and Cubby Blast are the main Area18 references in this starter data.`,
      links: [
        { label: 'CenterMass Area18', to: entityPath('store', 'centermass_area18') },
        { label: 'Cubby Blast Area18', to: entityPath('store', 'cubby_blast_area18') },
      ],
    };
  }

  if (q.includes('armor')) {
    const armor = data.armor.slice(0, 4);
    return {
      answer: `Starter armor records include ${armor.map((a) => a.name).join(', ')}. Open the Armor page to filter by class, manufacturer, and obtain method.`,
      links: armor.map((item) => ({ label: item.name, to: entityPath('armor', item.id) })),
    };
  }

  if (q.includes('craft') || q.includes('blueprint') || q.includes('recipe')) {
    const recipes = data.crafting.recipes.slice(0, 3);
    return {
      answer: `Crafting in this app is organized around blueprints and recipes. Example outputs include ${recipes.map((recipe) => {
        const out = data.weapons.find((w) => w.id === recipe.outputItemId) || data.armor.find((a) => a.id === recipe.outputItemId);
        return out?.name ?? recipe.id;
      }).join(', ')}.`,
      links: recipes.map((item) => ({ label: item.id, to: entityPath('recipe', item.id) })),
    };
  }

  const location = data.locations.find((item) => contains(q, item.name.toLowerCase()));
  if (location) {
    const vendors = data.stores.filter((store) => store.locationId === location.id);
    return {
      answer: `${location.name} is a ${location.locationType ?? 'location'} in ${location.parent ?? 'the system'}. Known vendor references here include ${vendors.map((v) => v.name).join(', ') || 'no vendors yet in the sample data'}.`,
      links: [{ label: location.name, to: entityPath('location', location.id) }, ...vendors.slice(0, 3).map((v) => ({ label: v.name, to: entityPath('store', v.id) }))],
    };
  }

  return {
    answer: 'I could not find a strong direct match yet. Try asking about a resource, a location, ROC mining, a weapon store, armor, or crafting blueprints.',
    links: [
      { label: 'Resources', to: '/resources' },
      { label: 'Mining', to: '/mining' },
      { label: 'Crafting', to: '/crafting' },
    ],
  };
}
