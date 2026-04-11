import { getJson } from "../lib/http.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const API = "https://starcitizen.tools/api.php";
const ROOT = process.cwd();
const BASE_DATASET_PATH = path.join(ROOT, "star-ops-master-data.json");

const EXTRA_IN_GAME_LOCATIONS = [
  { id: "pyro", name: "Pyro", systemId: "pyro", locationType: "system" },
  { id: "pyro-1", name: "Pyro I", systemId: "pyro", locationType: "planet" },
  { id: "pyro-2", name: "Pyro II", systemId: "pyro", locationType: "planet" },
  { id: "pyro-3", name: "Pyro III", systemId: "pyro", locationType: "planet" },
  { id: "pyro-4", name: "Pyro IV", systemId: "pyro", locationType: "planet" },
  { id: "pyro-5", name: "Pyro V", systemId: "pyro", locationType: "planet" },
  { id: "pyro-6", name: "Pyro VI", systemId: "pyro", locationType: "planet" },
  { id: "ruin-station", name: "Ruin Station", systemId: "pyro", locationType: "station" },
  { id: "terminus", name: "Terminus", systemId: "pyro", locationType: "station" },
  { id: "bloom", name: "Bloom", systemId: "pyro", locationType: "moon" },
  { id: "monox", name: "Monox", systemId: "pyro", locationType: "moon" },
  { id: "adir", name: "Adir", systemId: "pyro", locationType: "moon" },
  { id: "ignis", name: "Ignis", systemId: "pyro", locationType: "planet" }
];

async function fetchPageExtract(title) {
  return getJson(
    `${API}?action=query&prop=extracts|pageimages&explaintext=1&format=json&titles=${encodeURIComponent(title)}&piprop=thumbnail|original&pithumbsize=640`
  );
}

async function fetchSearchTitles(query, limit = 5) {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: String(limit),
    format: "json"
  });

  const payload = await getJson(`${API}?${params.toString()}`);
  return (payload?.query?.search ?? []).map((entry) => entry.title).filter(Boolean);
}

async function fetchCategoryMembers(categoryTitle) {
  const members = [];
  let continueToken = null;

  do {
    const params = new URLSearchParams({
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${categoryTitle}`,
      cmlimit: "500",
      format: "json"
    });

    if (continueToken) {
      params.set("cmcontinue", continueToken);
    }

    const payload = await getJson(`${API}?${params.toString()}`);
    members.push(...(payload?.query?.categorymembers ?? []).filter((entry) => entry.ns === 0));
    continueToken = payload?.continue?.cmcontinue ?? null;
  } while (continueToken);

  return members;
}

async function fetchPageText(title) {
  const data = await fetchPageExtract(title);
  const pages = data?.query?.pages || {};
  const page = Object.values(pages)[0];
  return page?.extract || "";
}

async function fetchPageDetails(title) {
  const data = await fetchPageExtract(title);
  const pages = data?.query?.pages || {};
  const page = Object.values(pages)[0] || {};

  return {
    extract: page?.extract || "",
    imageUrl: page?.original?.source || page?.thumbnail?.source || null
  };
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = [];
  for (let index = 0; index < items.length; index += limit) {
    const chunk = items.slice(index, index + limit);
    const chunkResults = await Promise.all(chunk.map(mapper));
    results.push(...chunkResults);
  }
  return results;
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeToken(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function uniqueStrings(values) {
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textIncludesPhrase(text, phrase) {
  const normalizedText = String(text ?? "").toLowerCase();
  const normalizedPhrase = String(phrase ?? "").trim().toLowerCase();

  if (!normalizedText || !normalizedPhrase) {
    return false;
  }

  if (normalizedPhrase.length < 4) {
    return normalizedText.includes(normalizedPhrase);
  }

  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedPhrase)}([^a-z0-9]|$)`, "i").test(normalizedText);
}

function buildKnownLocationPool(baseDataset) {
  const fromBase = (baseDataset.locations || []).map((entry) => ({
    id: entry.id ?? slugify(entry.name),
    name: entry.name,
    systemId: entry.systemId ?? "unknown",
    locationType: entry.locationType ?? "location"
  }));

  const map = new Map();
  for (const entry of [...fromBase, ...EXTRA_IN_GAME_LOCATIONS]) {
    const key = slugify(entry.name ?? entry.id);
    if (!map.has(key)) {
      map.set(key, entry);
    }
  }

  return Array.from(map.values());
}

async function readBaseDataset() {
  const raw = await readFile(BASE_DATASET_PATH, "utf8");
  return JSON.parse(raw);
}

function extractLocationMentions(text, knownLocations) {
  const normalized = text.toLowerCase();
  const compact = normalizeToken(text);

  return knownLocations
    .filter((entry) => {
      const name = String(entry.name ?? "").trim();
      if (name.length < 4) {
        return false;
      }

      const lowerName = name.toLowerCase();
      const compactName = normalizeToken(name);

      return normalized.includes(lowerName) || (compactName.length >= 5 && compact.includes(compactName));
    })
    .slice(0, 12)
    .map((entry) => entry.id ?? slugify(entry.name));
}

function extractPurchaseLocationMentions(text, stores) {
  return uniqueStrings(
    stores.flatMap((entry) => {
      const candidates = [entry.name, entry.subLocation].filter(Boolean);
      const matched = candidates.some((value) => textIncludesPhrase(text, value));
      return matched && entry.locationId ? [entry.locationId] : [];
    })
  ).slice(0, 8);
}

async function buildBaseRecordEnrichment(baseDataset) {
  const knownLocationPool = buildKnownLocationPool(baseDataset);
  const resources = [];
  const armor = [];
  const weapons = [];
  const locations = [];
  const vendors = [];

  const tasks = [
    ...baseDataset.resources.map((entry) => ({ kind: "resource", entry })),
    ...baseDataset.armor.map((entry) => ({ kind: "armor", entry })),
    ...baseDataset.weapons.map((entry) => ({ kind: "weapon", entry })),
    ...baseDataset.locations.map((entry) => ({ kind: "location", entry })),
    ...baseDataset.stores.map((entry) => ({ kind: "vendor", entry }))
  ];

  for (const task of tasks) {
    const details = await fetchPageDetails(task.entry.name);
    const extract = details.extract;
    if (!extract) {
      continue;
    }

    const summary = extract.replace(/\s+/g, " ").trim().slice(0, 900);
    const locationIds = extractLocationMentions(extract, knownLocationPool);
    const storeIds = extractPurchaseLocationMentions(extract, baseDataset.stores);

    if (task.kind === "resource") {
      resources.push({
        name: task.entry.name,
        slug: slugify(task.entry.name),
        description: summary,
        verificationStatus: "community_verified",
        confidenceScore: 0.82,
        knownLocations: locationIds,
        purchaseLocations: storeIds,
        imageUrl: details.imageUrl,
        sourceNotes: `Live wiki enrichment for ${task.entry.name}`
      });
      continue;
    }

    if (task.kind === "armor") {
      armor.push({
        name: task.entry.name,
        slug: slugify(task.entry.name),
        description: summary,
        verificationStatus: "community_verified",
        confidenceScore: 0.76,
        purchaseLocations: storeIds,
        foundLocations: locationIds,
        imageUrl: details.imageUrl,
        manufacturer: task.entry.manufacturer
      });
      continue;
    }

    if (task.kind === "weapon") {
      weapons.push({
        name: task.entry.name,
        slug: slugify(task.entry.name),
        description: summary,
        verificationStatus: "community_verified",
        confidenceScore: 0.76,
        purchaseLocations: storeIds,
        foundLocations: locationIds,
        imageUrl: details.imageUrl,
        class: task.entry.class,
        damageType: task.entry.damageType
      });
      continue;
    }

    if (task.kind === "location") {
      locations.push({
        name: task.entry.name,
        slug: slugify(task.entry.name),
        description: summary,
        verificationStatus: "community_verified",
        confidenceScore: 0.74
      });
      continue;
    }

    vendors.push({
      name: task.entry.name,
      slug: slugify(task.entry.name),
      description: summary,
      verificationStatus: "community_verified",
      confidenceScore: 0.72,
      locationIds
    });
  }

  return { resources, armor, weapons, locations, vendors };
}

async function buildDeepResourceLocationEnrichment(baseDataset) {
  const knownLocationPool = buildKnownLocationPool(baseDataset);
  const results = new Map();

  for (const resource of baseDataset.resources) {
    const resourceName = String(resource.name ?? "").trim();
    if (!resourceName) {
      continue;
    }

    const titles = new Set([resourceName]);
    const queries = [resourceName, `${resourceName} (Raw)`, `${resourceName} mining`];

    for (const query of queries) {
      try {
        const found = await fetchSearchTitles(query, 6);
        for (const title of found) {
          titles.add(title);
        }
      } catch {
        // Ignore search failures and continue with known titles.
      }
    }

    const extracts = [];
    for (const title of titles) {
      try {
        const text = await fetchPageText(title);
        if (text) {
          extracts.push(text);
        }
      } catch {
        // Ignore individual page failures.
      }
    }

    const mergedText = extracts.join("\n");
    const locationIds = extractLocationMentions(mergedText, knownLocationPool);
    if (locationIds.length > 0) {
      results.set(slugify(resourceName), locationIds);
    }
  }

  return results;
}

async function buildCategoryImports() {
  const [armorMembers, weaponMembers, attachmentMembers, locationMembers] = await Promise.all([
    fetchCategoryMembers("Armor_set"),
    fetchCategoryMembers("Personal_Weapons"),
    fetchCategoryMembers("Weapon_attachments"),
    fetchCategoryMembers("Locations")
  ]);

  const armor = armorMembers.slice(0, 60).map((entry) => ({
    name: entry.title,
    slug: slugify(entry.title),
    verificationStatus: "community_verified",
    confidenceScore: 0.7
  }));

  const weapons = weaponMembers.slice(0, 120).map((entry) => ({
    name: entry.title,
    slug: slugify(entry.title),
    verificationStatus: "community_verified",
    confidenceScore: 0.7
  }));

  const tools = attachmentMembers.slice(0, 120).map((entry) => ({
    name: entry.title,
    slug: slugify(entry.title),
    category: "weapon_attachment",
    verificationStatus: "community_verified",
    confidenceScore: 0.68
  }));

  const locations = locationMembers.slice(0, 180).map((entry) => ({
    name: entry.title,
    slug: slugify(entry.title),
    verificationStatus: "community_verified",
    confidenceScore: 0.68
  }));

  return { armor, weapons, tools, locations };
}

async function enrichCategoryItems(items, kind, baseDataset) {
  const knownLocationPool = buildKnownLocationPool(baseDataset);
  const enriched = await mapWithConcurrency(items, 10, async (item) => {
    try {
      const details = await fetchPageDetails(item.name);
      const extract = details.extract;
      if (!extract) {
        return item;
      }

      const summary = extract.replace(/\s+/g, " ").trim().slice(0, 900);
      const locationIds = extractLocationMentions(extract, knownLocationPool);
      const storeIds = extractPurchaseLocationMentions(extract, baseDataset.stores);

      return {
        ...item,
        description: summary,
        confidenceScore: 0.76,
        imageUrl: details.imageUrl,
        ...(kind === "armor"
          ? {
              purchaseLocations: storeIds,
              foundLocations: locationIds
            }
          : {
              purchaseLocations: storeIds,
              foundLocations: locationIds
            })
      };
    } catch {
      return item;
    }
  });

  return enriched;
}

async function buildLocationItemMentions(baseDataset, itemNames) {
  const knownLocationPool = buildKnownLocationPool(baseDataset);
  const locationPages = knownLocationPool
    .filter((entry) => String(entry.name ?? '').trim().length > 0)
    .map((entry) => ({ id: String(entry.id ?? slugify(entry.name)), name: String(entry.name) }));

  const normalizedItems = Array.from(new Set((itemNames || []).map((name) => String(name ?? '').trim()).filter(Boolean))).map((name) => ({
    name,
    key: slugify(name),
    lower: name.toLowerCase(),
  }));

  const hints = new Map();

  const pageTexts = await mapWithConcurrency(locationPages, 8, async (location) => {
    try {
      const text = await fetchPageText(location.name);
      return { locationId: location.id, text: String(text ?? '') };
    } catch {
      return { locationId: location.id, text: '' };
    }
  });

  for (const page of pageTexts) {
    const lowerText = page.text.toLowerCase();
    if (!lowerText) {
      continue;
    }

    for (const item of normalizedItems) {
      if (!textIncludesPhrase(lowerText, item.lower)) {
        continue;
      }

      const current = hints.get(item.key) ?? [];
      hints.set(item.key, [...new Set([...current, page.locationId])]);
    }
  }

  return hints;
}

async function buildVendorItemPurchaseHints(baseDataset, itemNames) {
  const stores = Array.isArray(baseDataset.stores) ? baseDataset.stores : [];
  const vendorPages = Array.from(
    new Map(
      stores.map((store) => [
        slugify(store.name),
        {
          name: String(store.name ?? "").trim(),
          locationIds: uniqueStrings(
            stores
              .filter((entry) => slugify(entry.name) === slugify(store.name))
              .map((entry) => entry.locationId)
              .filter(Boolean)
          )
        }
      ])
    ).values()
  ).filter((entry) => entry.name.length > 0 && entry.locationIds.length > 0);

  const normalizedItems = Array.from(new Set((itemNames || []).map((name) => String(name ?? "").trim()).filter(Boolean))).map((name) => ({
    key: slugify(name),
    lower: name.toLowerCase()
  }));

  const hints = new Map();
  const pageTexts = await mapWithConcurrency(vendorPages, 6, async (vendor) => {
    try {
      const text = await fetchPageText(vendor.name);
      return { locationIds: vendor.locationIds, text: String(text ?? "") };
    } catch {
      return { locationIds: vendor.locationIds, text: "" };
    }
  });

  for (const page of pageTexts) {
    const lowerText = page.text.toLowerCase();
    if (!lowerText) {
      continue;
    }

    for (const item of normalizedItems) {
      if (!textIncludesPhrase(lowerText, item.lower)) {
        continue;
      }

      const current = hints.get(item.key) ?? [];
      hints.set(item.key, uniqueStrings([...current, ...page.locationIds]));
    }
  }

  return hints;
}

async function buildCategoryBasedWeaponArmorLocations(baseDataset) {
  const stores = Array.isArray(baseDataset.stores) ? baseDataset.stores : [];
  const weapons = Array.isArray(baseDataset.weapons) ? baseDataset.weapons : [];
  const armor = Array.isArray(baseDataset.armor) ? baseDataset.armor : [];

  // Map vendor categories to location IDs
  const weaponVendorLocations = stores
    .filter((store) => Array.isArray(store.products) && store.products.some((cat) => /personal_weapon|weapon/i.test(cat)))
    .map((store) => store.locationId)
    .filter(Boolean);

  const armorVendorLocations = stores
    .filter((store) => Array.isArray(store.products) && store.products.some((cat) => /personal_armor|armor/i.test(cat)))
    .map((store) => store.locationId)
    .filter(Boolean);

  const weaponHints = new Map();
  const armorHints = new Map();

  // Map all weapons to their vendor locations
  for (const weapon of weapons) {
    const key = slugify(weapon.name ?? weapon.id);
    if (weaponVendorLocations.length > 0) {
      weaponHints.set(key, weaponVendorLocations);
    }
  }

  // Map all armor to their vendor locations
  for (const armorItem of armor) {
    const key = slugify(armorItem.name ?? armorItem.id);
    if (armorVendorLocations.length > 0) {
      armorHints.set(key, armorVendorLocations);
    }
  }

  return { weaponHints, armorHints };
}

export async function fetchStarCitizenToolsData() {
  const baseDataset = await readBaseDataset();
  const targetPages = [
    "Mining",
    "Hadanite",
    "Janalite",
    "Quantanium (Raw)",
    "Asteroid"
  ];

  const resources = [];
  const locations = [];
  const miningMethods = [
    {
      name: "FPS mining",
      slug: "fps-mining",
      description: "Handheld cave and small-node mining",
      verificationStatus: "community_verified",
      confidenceScore: 0.8
    },
    {
      name: "ROC mining",
      slug: "roc-mining",
      description: "Vehicle-based gemstone mining",
      verificationStatus: "community_verified",
      confidenceScore: 0.8
    },
    {
      name: "Ship mining",
      slug: "ship-mining",
      description: "Large ore and asteroid mining",
      verificationStatus: "community_verified",
      confidenceScore: 0.8
    }
  ];

  for (const title of targetPages) {
    const data = await fetchPageExtract(title);
    const pages = data?.query?.pages || {};
    const page = Object.values(pages)[0];
    const text = page?.extract || "";

    if (/Hadanite/i.test(title)) {
      resources.push({
        name: "Hadanite",
        slug: "hadanite",
        description: text.slice(0, 1200),
        verificationStatus: "community_verified",
        confidenceScore: 0.85,
        environments: ["surface", "cave"],
        sourceNotes: "Populate exact locations from wiki text parser"
      });
    } else if (/Janalite/i.test(title)) {
      resources.push({
        name: "Janalite",
        slug: "janalite",
        description: text.slice(0, 1200),
        verificationStatus: "community_verified",
        confidenceScore: 0.9,
        environments: ["sand_cave"]
      });
    } else if (/Quantanium/i.test(title)) {
      resources.push({
        name: "Quantanium",
        slug: "quantanium",
        description: text.slice(0, 1200),
        verificationStatus: "community_verified",
        confidenceScore: 0.9,
        environments: ["space", "surface"],
        volatile: true,
        requiresRefining: true
      });
    }
  }

  const [baseEnrichment, categoryImports, deepResourceLocations] = await Promise.all([
    buildBaseRecordEnrichment(baseDataset),
    buildCategoryImports(),
    buildDeepResourceLocationEnrichment(baseDataset)
  ]);

  const [deepArmorImports, deepWeaponImports, deepToolImports] = await Promise.all([
    enrichCategoryItems(categoryImports.armor, "armor", baseDataset),
    enrichCategoryItems(categoryImports.weapons, "weapon", baseDataset),
    enrichCategoryItems(categoryImports.tools, "tool", baseDataset)
  ]);

  const trackedItemNames = [
    ...baseEnrichment.resources.map((entry) => entry.name),
    ...baseEnrichment.weapons.map((entry) => entry.name),
    ...baseEnrichment.armor.map((entry) => entry.name),
    ...deepWeaponImports.map((entry) => entry.name),
    ...deepArmorImports.map((entry) => entry.name),
    ...deepToolImports.map((entry) => entry.name)
  ];

  const [locationMentionHints, vendorItemPurchaseHints, categoryBasedLocations] = await Promise.all([
    buildLocationItemMentions(baseDataset, trackedItemNames),
    buildVendorItemPurchaseHints(baseDataset, trackedItemNames),
    buildCategoryBasedWeaponArmorLocations(baseDataset)
  ]);

  const applyLocationHints = (items, locationField, hintMap = locationMentionHints) =>
    items.map((entry) => {
      const hinted = hintMap.get(slugify(entry.name)) ?? [];
      return {
        ...entry,
        [locationField]: uniqueStrings([...(entry[locationField] ?? []), ...hinted])
      };
    });

  const hintedWeapons = applyLocationHints(deepWeaponImports, 'foundLocations');
  const hintedArmor = applyLocationHints(deepArmorImports, 'foundLocations');
  const hintedTools = applyLocationHints(deepToolImports, 'foundLocations');

  const hintedBaseWeapons = applyLocationHints(baseEnrichment.weapons, 'foundLocations');
  const hintedBaseArmor = applyLocationHints(baseEnrichment.armor, 'foundLocations');

  const purchasableWeapons = applyLocationHints([...hintedBaseWeapons, ...hintedWeapons], 'purchaseLocations', vendorItemPurchaseHints);
  const purchasableArmor = applyLocationHints([...hintedBaseArmor, ...hintedArmor], 'purchaseLocations', vendorItemPurchaseHints);
  const purchasableTools = applyLocationHints(hintedTools, 'purchaseLocations', vendorItemPurchaseHints);

  // Apply category-based vendor locations for comprehensive weapon/armor coverage
  const weaponsWithCategoryLocations = purchasableWeapons.map((weapon) => {
    const categoryHints = categoryBasedLocations.weaponHints.get(slugify(weapon.name)) ?? [];
    return {
      ...weapon,
      purchaseLocations: uniqueStrings([...(weapon.purchaseLocations ?? []), ...categoryHints])
    };
  });

  const armorWithCategoryLocations = purchasableArmor.map((armor) => {
    const categoryHints = categoryBasedLocations.armorHints.get(slugify(armor.name)) ?? [];
    return {
      ...armor,
      purchaseLocations: uniqueStrings([...(armor.purchaseLocations ?? []), ...categoryHints])
    };
  });

  const deepResourceImports = applyLocationHints(baseEnrichment.resources.map((resource) => {
    const hintedLocations = deepResourceLocations.get(slugify(resource.name)) ?? [];

    return {
      ...resource,
      knownLocations: [...new Set([...(resource.knownLocations ?? []), ...hintedLocations])]
    };
  }), 'purchaseLocations', vendorItemPurchaseHints);

  return {
    meta: {
      sourceName: "StarCitizen.tools"
    },
    systems: [],
    locations: [...locations, ...baseEnrichment.locations, ...categoryImports.locations, ...EXTRA_IN_GAME_LOCATIONS],
    resources: [...resources, ...deepResourceImports],
    miningMethods,
    tools: purchasableTools,
    vehicles: [],
    vendors: baseEnrichment.vendors,
    lootSources: [],
    blueprints: [],
    recipes: [],
    weapons: weaponsWithCategoryLocations,
    armor: armorWithCategoryLocations
  };
}