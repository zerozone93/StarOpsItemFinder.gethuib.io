import type { EntityName } from '../types/shared.js';
import { prisma } from '../lib/prisma.js';
import { getPagination } from '../utils/pagination.js';
import { HttpError } from '../lib/errors.js';

const includeMap = {
  systems: {},
  locations: {
    system: true,
    parentLocation: true,
    childLocations: true,
    resourceLocations: { include: { resource: true } },
    vendorLocations: { include: { vendor: true } }
  },
  resources: {
    locations: { include: { location: true } },
    miningMethods: { include: { miningMethod: true } },
    tools: { include: { tool: true } },
    vehicles: { include: { vehicle: true } },
    recipeInputs: { include: { recipe: true } },
    sources: { include: { sourceReference: true } }
  },
  miningMethods: {
    resources: { include: { resource: true } },
    tools: { include: { tool: true } },
    vehicles: { include: { vehicle: true } }
  },
  tools: { manufacturer: true, miningMethods: { include: { miningMethod: true } } },
  vehicles: { manufacturer: true, miningMethods: { include: { miningMethod: true } } },
  vendors: { locations: { include: { location: true } }, weaponLinks: { include: { weapon: true } }, armorLinks: { include: { armor: true } } },
  lootSources: { locations: { include: { location: true } }, weapons: { include: { weapon: true } }, armor: { include: { armor: true } } },
  weapons: { manufacturer: true, vendors: { include: { vendor: true } }, lootSources: { include: { lootSource: true } }, recipe: { include: { ingredients: { include: { resource: true } }, blueprint: true } }, sources: { include: { sourceReference: true } } },
  armor: { manufacturer: true, vendors: { include: { vendor: true } }, lootSources: { include: { lootSource: true } }, recipe: { include: { ingredients: { include: { resource: true } }, blueprint: true } }, sources: { include: { sourceReference: true } } },
  blueprints: { recipes: { include: { ingredients: { include: { resource: true } }, weapon: true, armor: true } } },
  recipes: { ingredients: { include: { resource: true } }, blueprint: true, weapon: true, armor: true, sources: { include: { sourceReference: true } } }
} as const;

const modelMap = {
  systems: prisma.system,
  locations: prisma.location,
  resources: prisma.resource,
  miningMethods: prisma.miningMethod,
  tools: prisma.tool,
  vehicles: prisma.vehicle,
  vendors: prisma.vendor,
  lootSources: prisma.lootSource,
  weapons: prisma.weapon,
  armor: prisma.armor,
  blueprints: prisma.blueprint,
  recipes: prisma.recipe
} as const;

export async function listEntities(entity: EntityName, params: { page?: number; pageSize?: number; q?: string; category?: string; location?: string; obtainMethod?: string }) {
  const model = modelMap[entity];
  const include = includeMap[entity];
  const { skip, take } = getPagination(params.page, params.pageSize);

  const where: Record<string, unknown> = {};
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: 'insensitive' } },
      { slug: { contains: params.q, mode: 'insensitive' } },
      { description: { contains: params.q, mode: 'insensitive' } }
    ];
  }

  if (params.category) where.category = { equals: params.category, mode: 'insensitive' };
  if (params.obtainMethod) where.obtainMethod = params.obtainMethod;

  const [items, total] = await Promise.all([
    model.findMany({ where, include, skip, take, orderBy: { name: 'asc' } }),
    model.count({ where })
  ]);

  return {
    items,
    pagination: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      total,
      totalPages: Math.ceil(total / (params.pageSize ?? 20))
    }
  };
}

export async function getEntityByIdOrSlug(entity: EntityName, idOrSlug: string) {
  const model = modelMap[entity];
  const include = includeMap[entity];
  const item = await model.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }]
    },
    include
  });

  if (!item) throw new HttpError(404, `${entity} record not found`);
  return item;
}
