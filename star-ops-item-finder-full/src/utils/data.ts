import { MasterData, Recipe, SearchEntity } from '../types/data';

export async function loadData(): Promise<MasterData> {
  const response = await fetch(`${import.meta.env.BASE_URL}star-citizen-data.json`);
  if (!response.ok) throw new Error('Failed to load star-citizen-data.json');
  return response.json();
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function entityPath(type: string, id: string) {
  return `/entity/${type}/${id}`;
}

export function buildSearchIndex(data: MasterData): SearchEntity[] {
  return [
    ...data.resources.map((item) => ({ ...item, entityType: 'resource' as const })),
    ...data.weapons.map((item) => ({ ...item, entityType: 'weapon' as const })),
    ...data.armor.map((item) => ({ ...item, entityType: 'armor' as const })),
    ...data.stores.map((item) => ({ ...item, entityType: 'store' as const })),
    ...data.locations.map((item) => ({ ...item, entityType: 'location' as const })),
    ...data.crafting.blueprints.map((item) => ({ ...item, entityType: 'blueprint' as const })),
    ...data.crafting.recipes.map((item) => ({ ...item, entityType: 'recipe' as const })),
    ...data.toolsAndVehicles.map((item) => ({ ...item, entityType: 'tool' as const })),
    ...data.miningMethods.map((item) => ({ ...item, entityType: 'mining' as const })),
  ];
}

export function stringifyForSearch(entity: Record<string, unknown>) {
  return JSON.stringify(entity).toLowerCase();
}

export function recipeLabel(recipe: Recipe, data: MasterData) {
  const output = data.weapons.find((w) => w.id === recipe.outputItemId) || data.armor.find((a) => a.id === recipe.outputItemId);
  return output?.name ?? recipe.id;
}

export function labelForVerification(status?: string) {
  if (!status) return 'unknown';
  return status.replaceAll('_', ' ');
}

export function getLocationName(data: MasterData, id?: string) {
  return data.locations.find((item) => item.id === id)?.name ?? id ?? 'Unknown';
}

export function getStoreName(data: MasterData, id?: string) {
  return data.stores.find((item) => item.id === id)?.name ?? id ?? 'Unknown';
}

export function getResourceName(data: MasterData, id?: string) {
  return data.resources.find((item) => item.id === id)?.name ?? id ?? 'Unknown';
}

export function getToolName(data: MasterData, id?: string) {
  return data.toolsAndVehicles.find((item) => item.id === id)?.name ?? id ?? 'Unknown';
}
