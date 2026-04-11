import type { StarCitizenData, Resource, Location } from '../../../types';
import type { Intent, AssistantResponse } from '../types';
import { fuzzySearch } from './fuzzyMatch';

function listNames(names: string[]): string {
  if (names.length === 0) return 'none found';
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

function findResourcesByEntity(data: StarCitizenData, entities: string[]): Resource[] {
  return data.resources.filter((r) =>
    entities.some(
      (e) =>
        r.name.toLowerCase().includes(e) ||
        r.slug.includes(e) ||
        r.tags.some((t) => t.includes(e))
    )
  );
}

function findLocationsByEntity(data: StarCitizenData, entities: string[]): Location[] {
  return data.locations.filter((l) =>
    entities.some(
      (e) =>
        l.name.toLowerCase().includes(e) ||
        l.slug.includes(e) ||
        l.tags.some((t) => t.includes(e))
    )
  );
}

export function buildAnswer(intent: Intent, data: StarCitizenData): AssistantResponse {
  const { type, entities, rawQuery } = intent;
  const q = rawQuery.toLowerCase();

  if (type === 'find_resource_location') {
    const resources = findResourcesByEntity(data, entities).length
      ? findResourcesByEntity(data, entities)
      : fuzzySearch(data.resources, rawQuery, 20);

    if (resources.length === 0) {
      return {
        message: `I couldn't find a resource matching "${rawQuery}". Try searching for Hadanite, Quantanium, Agricium, Laranite, Titanium, Tungsten, or Diamond.`,
        suggestions: ['Where do I find Hadanite?', 'Where is Quantanium found?', 'Show me rare resources'],
      };
    }

    const answers = resources.slice(0, 3).map((r) => {
      const locationNames = r.locationIds
        .map((lid) => data.locations.find((l) => l.id === lid)?.name ?? lid)
        .filter(Boolean);
      const methods = r.miningMethodIds
        .map((mid) => data.miningMethods.find((m) => m.id === mid)?.name ?? mid)
        .filter(Boolean);
      return `**${r.name}** (${r.rarity}, ${r.baseValue} aUEC/unit)\n` +
        `  📍 Locations: ${listNames(locationNames)}\n` +
        `  ⛏️ Methods: ${listNames(methods)}`;
    });

    return {
      message: answers.join('\n\n'),
      relatedIds: resources.map((r) => r.id),
      suggestions: ['What tools do I need for ROC mining?', 'Show me ship mining tools'],
    };
  }

  if (type === 'find_vendor') {
    const locs = findLocationsByEntity(data, entities);
    const locationFilter = locs.length > 0 ? locs.map((l) => l.id) : null;

    let vendors = locationFilter
      ? data.vendors.filter((v) => locationFilter.includes(v.locationId))
      : fuzzySearch(data.vendors, rawQuery, 20);

    if (vendors.length === 0) vendors = data.vendors.slice(0, 5);

    const locName = locs.length > 0 ? locs[0].name : 'Stanton';
    const vendorLines = vendors.slice(0, 5).map((v) => {
      const loc = data.locations.find((l) => l.id === v.locationId);
      return `**${v.name}** — ${loc?.name ?? 'Unknown'} (${v.category})`;
    });

    return {
      message: `Vendors in ${locName}:\n\n${vendorLines.join('\n')}`,
      relatedIds: vendors.map((v) => v.id),
      suggestions: ['What weapons does CenterMass sell?', 'Show me armor vendors in Lorville'],
    };
  }

  if (type === 'mining_requirements') {
    const methods = fuzzySearch(data.miningMethods, rawQuery, 10);
    const matchedMethod = methods[0] ?? null;

    if (q.includes('fps') || q.includes('hand') || q.includes('multitool')) {
      const method = data.miningMethods.find((m) => m.id === 'mm-fps');
      if (method) {
        const tools = method.requiredTools
          .map((tid) => data.tools.find((t) => t.id === tid))
          .filter(Boolean);
        const toolLines = tools.map((t) => t ? `**${t.name}** (~${t.buyPrice?.toLocaleString() ?? '?'} aUEC)` : '');
        const resources = method.resourceIds
          .map((rid) => data.resources.find((r) => r.id === rid)?.name)
          .filter(Boolean);
        return {
          message: `**FPS Mining Requirements:**\n\n🔧 Tools needed:\n${toolLines.join('\n')}\n\n⛏️ Mineable resources:\n${listNames(resources as string[])}\n\n💡 Tip: Mine in caves on Aberdeen, Arial, or Wala for best results.`,
          suggestions: ['Where do I find Hadanite?', 'What is ROC mining?'],
        };
      }
    }

    if (q.includes('roc') || q.includes('ground vehicle')) {
      const method = data.miningMethods.find((m) => m.id === 'mm-roc');
      if (method) {
        const tools = method.requiredTools
          .map((tid) => data.tools.find((t) => t.id === tid))
          .filter(Boolean);
        const toolLines = tools.map((t) => t ? `**${t.name}** (~${t.buyPrice?.toLocaleString() ?? '?'} aUEC)` : '');
        return {
          message: `**ROC Mining Requirements:**\n\n🚗 Vehicle needed:\n${toolLines.join('\n')}\n\n💡 Best location: Daymar (Quantanium). ROC fits in most ship cargo bays.\n⚠️ Quantanium is unstable — refine quickly after mining!`,
          suggestions: ['Where is Quantanium found?', 'Where do I buy a ROC?'],
        };
      }
    }

    if (q.includes('ship') || q.includes('prospector') || q.includes('mole')) {
      const method = data.miningMethods.find((m) => m.id === 'mm-ship');
      if (method) {
        return {
          message: `**Ship Mining Requirements:**\n\n🚀 Ships:\n- **MISC Prospector** (~2,061,900 aUEC) — Solo mining\n- **Argo MOLE** (~5,130,000 aUEC) — Crew mining (3 operators)\n\n💡 Purchase at Orison (Crusader Industries or Skutters)\n⛏️ Best for large asteroid belts and high-value ore runs.`,
          suggestions: ['Where do I buy a Prospector?', 'What can I mine with a ship?'],
        };
      }
    }

    if (matchedMethod) {
      return {
        message: `**${matchedMethod.name}**: ${matchedMethod.description}`,
        suggestions: ['What do I need for FPS mining?', 'What do I need for ROC mining?'],
      };
    }

    return {
      message: `There are three mining methods in Star Citizen:\n\n1. **FPS Mining** — Use a Multi-Tool with mining attachment in caves\n2. **ROC Mining** — Use the MISC ROC ground vehicle on surfaces\n3. **Ship Mining** — Use a Prospector or MOLE for space/large deposits\n\nWhat would you like to know more about?`,
      suggestions: ['FPS mining requirements', 'ROC mining requirements', 'Ship mining requirements'],
    };
  }

  if (type === 'crafting_requirements') {
    const recipes = fuzzySearch(data.recipes, rawQuery, 20);
    if (recipes.length === 0) {
      return {
        message: `Crafting is planned for future content in Star Citizen. Currently limited recipes are available.\n\nAvailable recipes:\n${data.recipes.map((r) => `- **${r.name}**`).join('\n')}`,
        suggestions: ['Show me available blueprints'],
      };
    }
    const recipe = recipes[0];
    const ingLines = recipe.ingredients.map((ing) => {
      const res = data.resources.find((r) => r.id === ing.resourceId);
      return `  - ${res?.name ?? ing.resourceId} x${ing.quantity}`;
    });
    return {
      message: `**${recipe.name}**\n${recipe.description}\n\n🧪 Ingredients:\n${ingLines.join('\n')}\n⏱️ Crafting time: ${recipe.craftingTime}s\n🏭 Station: ${recipe.craftingStation}`,
    };
  }

  if (type === 'weapon_sources') {
    const weapons = fuzzySearch(data.weapons, rawQuery, 20).slice(0, 5);
    const locs = findLocationsByEntity(data, entities);

    if (locs.length > 0) {
      const loc = locs[0];
      const locVendors = data.vendors.filter((v) => v.locationId === loc.id);
      const wpnLines: string[] = [];
      locVendors.forEach((vendor) => {
        const wpns = vendor.inventory
          .map((id) => data.weapons.find((w) => w.id === id))
          .filter(Boolean);
        wpns.forEach((w) => {
          if (w) wpnLines.push(`**${w.name}** (${w.category}) — ${vendor.name} — ${w.buyPrice?.toLocaleString() ?? '?'} aUEC`);
        });
      });
      if (wpnLines.length > 0) {
        return {
          message: `Weapons available in **${loc.name}**:\n\n${wpnLines.join('\n')}`,
          suggestions: ['Show me armor in ' + loc.name, 'What vendors are in ' + loc.name + '?'],
        };
      }
    }

    if (weapons.length > 0) {
      const lines = weapons.map((w) => {
        const vendorNames = w.vendorIds
          .map((vid) => {
            const v = data.vendors.find((vend) => vend.id === vid);
            if (!v) return null;
            const loc = data.locations.find((l) => l.id === v.locationId);
            return `${v.name} (${loc?.name ?? '?'})`;
          })
          .filter(Boolean);
        return `**${w.name}** — ${w.category} — ${w.damage} dmg — Sold at: ${listNames(vendorNames as string[])}`;
      });
      return {
        message: lines.join('\n\n'),
        relatedIds: weapons.map((w) => w.id),
        suggestions: ['Where can I buy the P4-AR?', 'Show me weapons in Area18'],
      };
    }

    return {
      message: `Available weapons include:\n${data.weapons.slice(0, 5).map((w) => `- **${w.name}** (${w.category})`).join('\n')}\n\nAsk about specific weapons or locations for details!`,
      suggestions: ['Show me weapons in Area18', 'Where do I buy a sniper rifle?'],
    };
  }

  if (type === 'armor_sources') {
    const locs = findLocationsByEntity(data, entities);
    const armorItems = fuzzySearch(data.armor, rawQuery, 20).slice(0, 5);

    if (locs.length > 0) {
      const loc = locs[0];
      const locVendors = data.vendors.filter((v) => v.locationId === loc.id);
      const armorLines: string[] = [];
      locVendors.forEach((vendor) => {
        const armorPieces = vendor.inventory
          .map((id) => data.armor.find((a) => a.id === id))
          .filter(Boolean);
        armorPieces.forEach((a) => {
          if (a) armorLines.push(`**${a.name}** (${a.category}) — ${vendor.name} — ${a.buyPrice?.toLocaleString() ?? '?'} aUEC`);
        });
      });
      if (armorLines.length > 0) {
        return {
          message: `Armor available in **${loc.name}**:\n\n${armorLines.join('\n')}`,
          suggestions: ['Show me weapons in ' + loc.name],
        };
      }
    }

    if (armorItems.length > 0) {
      const lines = armorItems.map((a) => {
        const vendorNames = a.vendorIds
          .map((vid) => {
            const v = data.vendors.find((vend) => vend.id === vid);
            if (!v) return null;
            const loc = data.locations.find((l) => l.id === v.locationId);
            return `${v.name} (${loc?.name ?? '?'})`;
          })
          .filter(Boolean);
        return `**${a.name}** — ${a.category} — AR:${a.armorRating} — Sold at: ${listNames(vendorNames as string[])}`;
      });
      return {
        message: lines.join('\n\n'),
        relatedIds: armorItems.map((a) => a.id),
      };
    }

    return {
      message: `Available armor includes:\n${data.armor.slice(0, 5).map((a) => `- **${a.name}** (${a.category})`).join('\n')}\n\nAsk about specific armor or locations!`,
      suggestions: ['Show me armor in Lorville', 'What heavy armor is available?'],
    };
  }

  if (type === 'location_info') {
    const locs = findLocationsByEntity(data, entities).length
      ? findLocationsByEntity(data, entities)
      : fuzzySearch(data.locations, rawQuery, 20);

    if (locs.length > 0) {
      const loc = locs[0];
      const vendorNames = loc.vendorIds.map((vid) => data.vendors.find((v) => v.id === vid)?.name ?? vid);
      const resourceNames = loc.resourceIds.map((rid) => data.resources.find((r) => r.id === rid)?.name ?? rid);
      const parent = loc.parentId ? data.locations.find((l) => l.id === loc.parentId)?.name : null;
      return {
        message: `**${loc.name}** (${loc.category})\n${loc.description}\n\n` +
          (parent ? `🪐 Parent body: ${parent}\n` : '') +
          (resourceNames.length ? `⛏️ Resources: ${listNames(resourceNames)}\n` : '') +
          (vendorNames.length ? `🏪 Vendors: ${listNames(vendorNames)}` : 'No vendors found'),
        suggestions: ['What vendors are in ' + loc.name + '?', 'What resources are on ' + loc.name + '?'],
      };
    }
  }

  // General fallback
  const allResults = [
    ...fuzzySearch(data.resources, rawQuery, 30).map((r) => ({ type: 'Resource', name: r.name })),
    ...fuzzySearch(data.locations, rawQuery, 30).map((l) => ({ type: 'Location', name: l.name })),
    ...fuzzySearch(data.weapons, rawQuery, 30).map((w) => ({ type: 'Weapon', name: w.name })),
    ...fuzzySearch(data.armor, rawQuery, 30).map((a) => ({ type: 'Armor', name: a.name })),
    ...fuzzySearch(data.vendors, rawQuery, 30).map((v) => ({ type: 'Vendor', name: v.name })),
  ].slice(0, 6);

  if (allResults.length > 0) {
    const lines = allResults.map((r) => `- **${r.name}** (${r.type})`);
    return {
      message: `I found these results for "${rawQuery}":\n\n${lines.join('\n')}\n\nAsk me more specifically about any of these!`,
      suggestions: ['Tell me about ' + (allResults[0]?.name ?? 'Stanton')],
    };
  }

  return {
    message: `I'm not sure how to answer "${rawQuery}". Try asking:\n- "Where do I find Hadanite?"\n- "What do I need for ROC mining?"\n- "Show me weapons in Area18"\n- "What armor can I buy in Lorville?"`,
    suggestions: [
      'Where do I find Hadanite?',
      'What do I need for ROC mining?',
      'Show me weapons in Area18',
      'What armor can I buy in Lorville?',
    ],
  };
}
