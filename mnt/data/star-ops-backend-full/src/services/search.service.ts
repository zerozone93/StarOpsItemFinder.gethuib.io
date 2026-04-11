import { prisma } from '../lib/prisma.js';
import { scoreTextMatch } from '../utils/search.js';

export async function globalSearch(query: string) {
  const q = query.trim();
  if (!q) return { groups: {} };

  const [resources, weapons, armor, vendors, locations, recipes] = await Promise.all([
    prisma.resource.findMany({ take: 50, include: { locations: { include: { location: true } } } }),
    prisma.weapon.findMany({ take: 50, include: { vendors: { include: { vendor: true } } } }),
    prisma.armor.findMany({ take: 50, include: { vendors: { include: { vendor: true } } } }),
    prisma.vendor.findMany({ take: 50, include: { locations: { include: { location: true } } } }),
    prisma.location.findMany({ take: 50 }),
    prisma.recipe.findMany({ take: 50, include: { ingredients: { include: { resource: true } }, blueprint: true } })
  ]);

  const groups = {
    resources: resources
      .map((item) => ({ ...item, _score: scoreTextMatch(q, [item.name, item.slug, item.description, item.category]) }))
      .filter((item) => item._score > 0)
      .sort((a, b) => b._score - a._score),
    weapons: weapons
      .map((item) => ({ ...item, _score: scoreTextMatch(q, [item.name, item.slug, item.description, item.category]) }))
      .filter((item) => item._score > 0)
      .sort((a, b) => b._score - a._score),
    armor: armor
      .map((item) => ({ ...item, _score: scoreTextMatch(q, [item.name, item.slug, item.description, item.category]) }))
      .filter((item) => item._score > 0)
      .sort((a, b) => b._score - a._score),
    vendors: vendors
      .map((item) => ({ ...item, _score: scoreTextMatch(q, [item.name, item.slug, item.description]) }))
      .filter((item) => item._score > 0)
      .sort((a, b) => b._score - a._score),
    locations: locations
      .map((item) => ({ ...item, _score: scoreTextMatch(q, [item.name, item.slug, item.description, item.type]) }))
      .filter((item) => item._score > 0)
      .sort((a, b) => b._score - a._score),
    recipes: recipes
      .map((item) => ({ ...item, _score: scoreTextMatch(q, [item.name, item.slug, item.description, item.fabricator]) }))
      .filter((item) => item._score > 0)
      .sort((a, b) => b._score - a._score)
  };

  return { groups };
}
