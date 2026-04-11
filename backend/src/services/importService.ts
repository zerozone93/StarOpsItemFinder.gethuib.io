import prisma from '../db/prisma.js';
import { ImportSummary } from '../types/index.js';

interface ImportData {
  resources?: Array<Record<string, unknown>>;
  weapons?: Array<Record<string, unknown>>;
  armor?: Array<Record<string, unknown>>;
  vendors?: Array<Record<string, unknown>>;
  locations?: Array<Record<string, unknown>>;
  recipes?: Array<Record<string, unknown>>;
}

async function upsertEntities(
  model: string,
  items: Array<Record<string, unknown>>,
  transform: (item: Record<string, unknown>) => Record<string, unknown>
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (prisma as any)[model];

  for (const item of items) {
    const data = transform(item);
    const slug = data.slug as string;
    if (!slug) continue;

    const existing = await delegate.findUnique({ where: { slug } });
    if (existing) {
      await delegate.update({ where: { slug }, data });
      updated++;
    } else {
      await delegate.create({ data });
      created++;
    }
  }

  return { created, updated };
}

function tagsToString(tags: unknown): string {
  if (Array.isArray(tags)) return JSON.stringify(tags);
  if (typeof tags === 'string') return tags;
  return '[]';
}

function baseTransform(item: Record<string, unknown>): Record<string, unknown> {
  return {
    slug: item.slug as string,
    name: item.name as string ?? '',
    description: item.description as string ?? '',
    verificationStatus: item.verificationStatus as string ?? 'unverified',
    sourceNotes: item.sourceNotes as string ?? '',
    patchVersion: item.patchVersion as string ?? '',
    tags: tagsToString(item.tags),
  };
}

export async function importData(data: ImportData): Promise<ImportSummary> {
  const summary: ImportSummary = {
    resources: { created: 0, updated: 0 },
    weapons: { created: 0, updated: 0 },
    armor: { created: 0, updated: 0 },
    vendors: { created: 0, updated: 0 },
    locations: { created: 0, updated: 0 },
    recipes: { created: 0, updated: 0 },
  };

  if (data.resources?.length) {
    summary.resources = await upsertEntities('resource', data.resources, (item) => ({
      ...baseTransform(item),
      category: item.category as string ?? 'mineral',
      rarity: item.rarity as string ?? 'common',
      instabilityRating: item.instabilityRating as number | undefined,
      baseValue: item.baseValue as number ?? 0,
      currency: item.currency as string ?? 'aUEC',
    }));
  }

  if (data.weapons?.length) {
    summary.weapons = await upsertEntities('weapon', data.weapons, (item) => ({
      ...baseTransform(item),
      category: item.category as string ?? 'rifle',
      manufacturer: item.manufacturer as string ?? '',
      damage: item.damage as number ?? 0,
      fireRate: item.fireRate as number ?? 0,
      ammoType: item.ammoType as string ?? '',
      attachmentSlots: item.attachmentSlots as number ?? 0,
      buyPrice: item.buyPrice as number | undefined,
    }));
  }

  if (data.armor?.length) {
    summary.armor = await upsertEntities('armor', data.armor, (item) => ({
      ...baseTransform(item),
      category: item.category as string ?? 'torso',
      manufacturer: item.manufacturer as string ?? '',
      armorRating: item.armorRating as number ?? 0,
      temperatureRating: item.temperatureRating as string ?? '',
      buyPrice: item.buyPrice as number | undefined,
    }));
  }

  if (data.vendors?.length) {
    summary.vendors = await upsertEntities('vendor', data.vendors, (item) => ({
      ...baseTransform(item),
      category: item.category as string ?? 'shop',
      locationId: item.locationId as string | undefined,
      inventory: Array.isArray(item.inventory) ? JSON.stringify(item.inventory) : '[]',
    }));
  }

  if (data.locations?.length) {
    summary.locations = await upsertEntities('location', data.locations, (item) => ({
      ...baseTransform(item),
      category: item.category as string ?? 'outpost',
      coordinates: item.coordinates as string | undefined,
    }));
  }

  if (data.recipes?.length) {
    summary.recipes = await upsertEntities('recipe', data.recipes, (item) => ({
      ...baseTransform(item),
      category: item.category as string ?? '',
      outputItemId: item.outputItemId as string ?? '',
      outputQuantity: item.outputQuantity as number ?? 1,
      craftingTime: item.craftingTime as number ?? 0,
      craftingStation: item.craftingStation as string ?? '',
    }));
  }

  return summary;
}
