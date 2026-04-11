import { prisma } from '../lib/prisma.js';
import type { AssistantAnswer } from '../types/shared.js';
import { globalSearch } from './search.service.js';

function uniqueEntities(items: Array<{ type: string; id: string; slug: string; name: string }>) {
  const map = new Map<string, { type: string; id: string; slug: string; name: string }>();
  for (const item of items) map.set(`${item.type}:${item.id}`, item);
  return [...map.values()];
}

export async function answerQuestion(question: string): Promise<AssistantAnswer> {
  const q = question.toLowerCase();

  if (q.includes('mine') || q.includes('mining') || q.includes('resource')) {
    const search = await globalSearch(question);
    const resource = search.groups.resources?.[0];
    if (resource) {
      const full = await prisma.resource.findUnique({
        where: { id: resource.id },
        include: {
          locations: { include: { location: true } },
          miningMethods: { include: { miningMethod: true } },
          tools: { include: { tool: true } },
          vehicles: { include: { vehicle: true } },
          sources: { include: { sourceReference: true } }
        }
      });
      if (full) {
        const methods = full.miningMethods.map((m) => m.miningMethod.name).join(', ') || 'unknown mining method';
        const places = full.locations.map((l) => l.location.name).join(', ') || 'no known locations stored yet';
        const gear = [...full.tools.map((t) => t.tool.name), ...full.vehicles.map((v) => v.vehicle.name)].join(', ') || 'no gear mapped yet';
        return {
          answer: `${full.name} can be found at ${places}. Mining method: ${methods}. Recommended tools or vehicles: ${gear}.`,
          confidence: full.confidenceScore,
          matchedEntities: uniqueEntities([{ type: 'resource', id: full.id, slug: full.slug, name: full.name }]),
          relatedEntities: uniqueEntities([
            ...full.locations.map((l) => ({ type: 'location', id: l.location.id, slug: l.location.slug, name: l.location.name })),
            ...full.miningMethods.map((m) => ({ type: 'miningMethod', id: m.miningMethod.id, slug: m.miningMethod.slug, name: m.miningMethod.name }))
          ]),
          verificationWarnings: full.verificationStatus === 'partial' ? ['This record is marked as partial.'] : [],
          sources: full.sources.map((s) => ({ label: s.sourceReference.label, url: s.sourceReference.url }))
        };
      }
    }
  }

  if (q.includes('weapon') || q.includes('armor') || q.includes('buy') || q.includes('vendor')) {
    const search = await globalSearch(question);
    const weapon = search.groups.weapons?.[0];
    const armor = search.groups.armor?.[0];
    const item = weapon ?? armor;

    if (item) {
      const isWeapon = Boolean(weapon);
      const full = isWeapon
        ? await prisma.weapon.findUnique({ where: { id: item.id }, include: { vendors: { include: { vendor: { include: { locations: { include: { location: true } } } } } }, lootSources: { include: { lootSource: true } }, sources: { include: { sourceReference: true } } } })
        : await prisma.armor.findUnique({ where: { id: item.id }, include: { vendors: { include: { vendor: { include: { locations: { include: { location: true } } } } } }, lootSources: { include: { lootSource: true } }, sources: { include: { sourceReference: true } } } });

      if (full) {
        const vendors = full.vendors.map((v) => {
          const loc = v.vendor.locations.map((l) => l.location.name).join(', ');
          return loc ? `${v.vendor.name} (${loc})` : v.vendor.name;
        });
        const loot = full.lootSources.map((l) => l.lootSource.name);
        return {
          answer: `${full.name} is obtained by ${full.obtainMethod}. Vendors: ${vendors.join(', ') || 'none mapped'}. Loot sources: ${loot.join(', ') || 'none mapped'}.`,
          confidence: full.confidenceScore,
          matchedEntities: [{ type: isWeapon ? 'weapon' : 'armor', id: full.id, slug: full.slug, name: full.name }],
          relatedEntities: uniqueEntities([
            ...full.vendors.map((v) => ({ type: 'vendor', id: v.vendor.id, slug: v.vendor.slug, name: v.vendor.name })),
            ...full.lootSources.map((l) => ({ type: 'lootSource', id: l.lootSource.id, slug: l.lootSource.slug, name: l.lootSource.name }))
          ]),
          verificationWarnings: full.verificationStatus === 'partial' ? ['This record is marked as partial.'] : [],
          sources: full.sources.map((s) => ({ label: s.sourceReference.label, url: s.sourceReference.url }))
        };
      }
    }
  }

  const fallback = await globalSearch(question);
  const matchedEntities = uniqueEntities([
    ...(fallback.groups.resources?.slice(0, 2).map((r) => ({ type: 'resource', id: r.id, slug: r.slug, name: r.name })) ?? []),
    ...(fallback.groups.weapons?.slice(0, 2).map((r) => ({ type: 'weapon', id: r.id, slug: r.slug, name: r.name })) ?? []),
    ...(fallback.groups.armor?.slice(0, 2).map((r) => ({ type: 'armor', id: r.id, slug: r.slug, name: r.name })) ?? []),
    ...(fallback.groups.locations?.slice(0, 2).map((r) => ({ type: 'location', id: r.id, slug: r.slug, name: r.name })) ?? [])
  ]);

  return {
    answer: matchedEntities.length
      ? `I found a few likely matches in the data. Start with ${matchedEntities.map((m) => m.name).join(', ')}.`
      : 'I could not find a strong match in the current database. Try a more specific item, resource, vendor, or location name.',
    confidence: matchedEntities.length ? 0.45 : 0.1,
    matchedEntities,
    relatedEntities: [],
    verificationWarnings: [],
    sources: []
  };
}
