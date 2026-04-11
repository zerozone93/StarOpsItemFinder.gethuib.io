import express from 'express';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const datasetPath = path.join(rootDir, 'star-ops-master-data.json');
const importedDatasetPath = path.join(rootDir, 'data', 'merged', 'canonical.json');
const storageDir = path.join(rootDir, 'server', 'storage');
const storagePath = path.join(storageDir, 'app-state.json');
const port = Number(process.env.PORT ?? 8787);
const sessionTtlMs = 1000 * 60 * 60 * 24 * 7;
const cacheTtlMs = 1000 * 15;
const autoSyncIntervalMs = 1000 * 60 * 60 * 12;

const collectionConfigs = {
  resources: {
    getItems: (data) => data.resources,
    findById: (data, id) => data.resources.find((entry) => entry.id === id),
    searchFields: ['id', 'name', 'category', 'locationNotes', 'verificationStatus'],
    sortKeys: ['name', 'category', 'verificationStatus'],
  },
  armor: {
    getItems: (data) => data.armor,
    findById: (data, id) => data.armor.find((entry) => entry.id === id),
    searchFields: ['id', 'name', 'class', 'manufacturer', 'verificationStatus'],
    sortKeys: ['name', 'class', 'verificationStatus'],
  },
  weapons: {
    getItems: (data) => data.weapons,
    findById: (data, id) => data.weapons.find((entry) => entry.id === id),
    searchFields: ['id', 'name', 'class', 'damageType', 'verificationStatus'],
    sortKeys: ['name', 'class', 'verificationStatus'],
  },
  utility: {
    getItems: (data) => data.utility,
    findById: (data, id) => data.utility.find((entry) => entry.id === id),
    searchFields: ['id', 'name', 'class', 'utilityType', 'verificationStatus'],
    sortKeys: ['name', 'class', 'verificationStatus'],
  },
  locations: {
    getItems: (data) => data.locations,
    findById: (data, id) => data.locations.find((entry) => entry.id === id),
    searchFields: ['id', 'name', 'systemId', 'locationType', 'parent'],
    sortKeys: ['name', 'locationType', 'systemId'],
  },
  stores: {
    getItems: (data) => data.stores,
    findById: (data, id) => data.stores.find((entry) => entry.id === id),
    searchFields: ['id', 'name', 'category', 'subLocation', 'verificationStatus'],
    sortKeys: ['name', 'category', 'verificationStatus'],
  },
  blueprints: {
    getItems: (data) => data.crafting.blueprints,
    findById: (data, id) => data.crafting.blueprints.find((entry) => entry.id === id),
    searchFields: ['id', 'name', 'craftsCategory', 'fabricatorType', 'verificationStatus'],
    sortKeys: ['name', 'craftsCategory', 'verificationStatus'],
  },
  recipes: {
    getItems: (data) => data.crafting.recipes,
    findById: (data, id) => data.crafting.recipes.find((entry) => entry.id === id),
    searchFields: ['id', 'blueprintId', 'outputItemId', 'verificationStatus'],
    sortKeys: ['id', 'outputItemId', 'verificationStatus'],
  },
};

const responseCache = new Map();

function formatLabel(value) {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueStrings(values) {
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password, salt, hash) {
  const derived = Buffer.from(hashPassword(password, salt), 'hex');
  const stored = Buffer.from(hash, 'hex');
  return derived.length === stored.length && timingSafeEqual(derived, stored);
}

function getDefaultAdminCredentials() {
  return {
    username: process.env.STAROPS_ADMIN_USERNAME ?? 'admin',
    password: process.env.STAROPS_ADMIN_PASSWORD ?? 'starops-admin',
  };
}

function sanitizeUsername(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32);
}

function validatePassword(value) {
  return typeof value === 'string' && value.length >= 10;
}

function defaultStorage() {
  const salt = randomBytes(16).toString('hex');
  const defaults = getDefaultAdminCredentials();

  return {
    version: 1,
    adminUsers: [
      {
        id: 'admin-default',
        username: defaults.username,
        salt,
        passwordHash: hashPassword(defaults.password, salt),
        createdAt: new Date().toISOString(),
      },
    ],
    sessions: [],
    uiOverrides: {
      featuredResourceIds: null,
      featuredArmorIds: null,
      featuredWeaponIds: null,
      featuredStoreIds: null,
      announcement: '',
      verificationNotes: [],
    },
    auditLog: [
      {
        id: randomUUID(),
        actor: defaults.username,
        action: 'bootstrap_storage',
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function ensureStorage() {
  mkdirSync(storageDir, { recursive: true });

  if (!existsSync(storagePath)) {
    writeFileSync(storagePath, JSON.stringify(defaultStorage(), null, 2));
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function readStorage() {
  ensureStorage();
  const storage = readJson(storagePath);
  storage.sessions = storage.sessions.filter((session) => new Date(session.expiresAt).getTime() > Date.now());
  return storage;
}

function getStorageSummary(storage) {
  ensureStorage();
  return {
    storagePath,
    datasetPath,
    storageExists: existsSync(storagePath),
    datasetVersion: getDatasetVersion(),
    sessions: storage.sessions.length,
    adminUsers: storage.adminUsers.length,
    auditEntries: storage.auditLog.length,
    lastAuditAt: storage.auditLog[0]?.createdAt ?? null,
  };
}

function writeStorage(nextStorage) {
  writeFileSync(storagePath, JSON.stringify(nextStorage, null, 2));
  responseCache.clear();
}

function appendAudit(storage, actor, action, details = {}) {
  storage.auditLog = [
    {
      id: randomUUID(),
      actor,
      action,
      details,
      createdAt: new Date().toISOString(),
    },
    ...(storage.auditLog ?? []),
  ].slice(0, 100);
}

function readRawDataset() {
  return readJson(datasetPath);
}

function readImportedDataset() {
  if (!existsSync(importedDatasetPath)) {
    return null;
  }

  return readJson(importedDatasetPath);
}

function mergeImportedCollection(rawItems, importedItems, options) {
  const importedBySlug = new Map(
    (importedItems ?? []).map((entry) => [slugify(entry.name ?? entry.slug ?? entry.id), entry]),
  );

  const merged = rawItems.map((item) => {
    const imported = importedBySlug.get(slugify(item.name ?? item.id));
    if (!imported) {
      return item;
    }

    return options.merge(item, imported);
  });

  const existingKeys = new Set(rawItems.map((item) => slugify(item.name ?? item.id)));
  const additions = (importedItems ?? [])
    .filter((entry) => !existingKeys.has(slugify(entry.name ?? entry.slug ?? entry.id)))
    .map((entry) => options.create(entry))
    .filter(Boolean);

  return [...merged, ...additions];
}

function mergeImportedData(raw) {
  const imported = readImportedDataset();
  if (!imported) {
    return {
      ...raw,
      utility: raw.utility ?? [],
    };
  }

  const locations = mergeImportedCollection(raw.locations, imported.locations, {
    merge: (item, live) => ({
      ...item,
      systemId:
        item.systemId === 'unknown' && /pyro|ignis|adir|bloom|ruin|terminus|monox|pyro\s*[1-6]/i.test(String(live.name ?? item.name ?? ''))
          ? 'pyro'
          : item.systemId,
      liveSummary: live.description ?? item.liveSummary,
    }),
    create: (live) => ({
      id: slugify(live.name ?? live.slug),
      name: live.name,
      systemId: /pyro|ignis|adir|bloom|ruin|terminus|monox|pyro\s*[1-6]/i.test(String(live.name ?? '')) ? 'pyro' : 'unknown',
      locationType: 'location',
      liveSummary: live.description,
    }),
  });

  const resources = mergeImportedCollection(raw.resources, imported.resources, {
    merge: (item, live) => ({
      ...item,
      locationNotes: live.description ?? item.locationNotes,
      liveSummary: live.description ?? item.liveSummary,
      imageUrl: live.imageUrl ?? item.imageUrl,
      knownLocations: uniqueStrings([...(item.knownLocations ?? []), ...(live.knownLocations ?? [])]),
      purchaseLocations: uniqueStrings([...(item.purchaseLocations ?? []), ...(live.purchaseLocations ?? [])]),
    }),
    create: (live) => ({
      id: slugify(live.name ?? live.slug),
      name: live.name,
      category: 'imported_resource',
      miningMethods: [],
      knownLocations: uniqueStrings(live.knownLocations ?? []),
      purchaseLocations: uniqueStrings(live.purchaseLocations ?? []),
      locationNotes: live.description ?? 'Imported live resource data.',
      liveSummary: live.description,
      imageUrl: live.imageUrl,
      verificationStatus: live.verificationStatus ?? 'community_verified',
      sourceRefs: ['src_starcitizentools_live'],
    }),
  });

  const armor = mergeImportedCollection(raw.armor, imported.armor, {
    merge: (item, live) => ({
      ...item,
      liveSummary: live.description ?? item.liveSummary,
      imageUrl: live.imageUrl ?? item.imageUrl,
      purchaseLocations: uniqueStrings([...(item.purchaseLocations ?? []), ...(live.purchaseLocations ?? [])]),
      foundLocations: uniqueStrings([...(item.foundLocations ?? []), ...(live.foundLocations ?? [])]),
    }),
    create: (live) => ({
      id: slugify(live.name ?? live.slug),
      name: live.name,
      class: 'unknown',
      manufacturer: live.manufacturer,
      recommendedFor: [],
      verificationStatus: live.verificationStatus ?? 'community_verified',
      liveSummary: live.description,
      imageUrl: live.imageUrl,
      purchaseLocations: uniqueStrings(live.purchaseLocations ?? []),
      foundLocations: uniqueStrings(live.foundLocations ?? []),
      sourceRefs: ['src_starcitizentools_live'],
    }),
  });

  const weapons = mergeImportedCollection(raw.weapons, imported.weapons, {
    merge: (item, live) => ({
      ...item,
      liveSummary: live.description ?? item.liveSummary,
      imageUrl: live.imageUrl ?? item.imageUrl,
      purchaseLocations: uniqueStrings([...(item.purchaseLocations ?? []), ...(live.purchaseLocations ?? [])]),
      foundLocations: uniqueStrings([...(item.foundLocations ?? []), ...(live.foundLocations ?? [])]),
    }),
    create: (live) => ({
      id: slugify(live.name ?? live.slug),
      name: live.name,
      class: live.class ?? 'attachment',
      damageType: live.damageType ?? 'utility',
      verificationStatus: live.verificationStatus ?? 'community_verified',
      liveSummary: live.description,
      imageUrl: live.imageUrl,
      purchaseLocations: uniqueStrings(live.purchaseLocations ?? []),
      foundLocations: uniqueStrings(live.foundLocations ?? []),
      obtainMethods: [],
      sourceRefs: ['src_starcitizentools_live'],
    }),
  });

  const utility = mergeImportedCollection(raw.utility ?? [], imported.tools, {
    merge: (item, live) => ({
      ...item,
      liveSummary: live.description ?? item.liveSummary,
      purchaseLocations: uniqueStrings([...(item.purchaseLocations ?? []), ...(live.purchaseLocations ?? [])]),
      foundLocations: uniqueStrings([...(item.foundLocations ?? []), ...(live.foundLocations ?? [])]),
      utilityType: live.utilityType ?? item.utilityType ?? live.category ?? 'support',
    }),
    create: (live) => ({
      id: slugify(live.name ?? live.slug),
      name: live.name,
      class: live.class ?? live.category ?? 'utility',
      utilityType: live.utilityType ?? live.category ?? 'support',
      verificationStatus: live.verificationStatus ?? 'community_verified',
      liveSummary: live.description,
      purchaseLocations: uniqueStrings(live.purchaseLocations ?? []),
      foundLocations: uniqueStrings(live.foundLocations ?? []),
      sourceRefs: ['src_starcitizentools_live'],
    }),
  });

  const stores = mergeImportedCollection(raw.stores, imported.vendors, {
    merge: (item, live) => ({
      ...item,
      liveSummary: live.description ?? item.liveSummary,
    }),
    create: (live) => ({
      id: slugify(live.name ?? live.slug),
      name: live.name,
      category: 'vendor',
      locationId: live.locationIds?.[0] ?? 'unknown',
      products: [],
      verificationStatus: live.verificationStatus ?? 'community_verified',
      liveSummary: live.description,
      sourceRefs: ['src_starcitizentools_live'],
    }),
  });

  const uniqueStores = Array.from(new Map(stores.map((store) => [String(store.id), store])).values());

  const unknownMarketLocationId = 'location:unknown-market';
  const missionRewardLocationId = 'location:mission-reward';
  const craftingLocationId = 'location:crafting-fabricator-network';
  const lootContainerLocationId = 'location:loot-crates-outposts-data-centers';
  const miningSourceUnknownLocationId = 'location:stanton-mining-claims';
  const pyroMiningClaimsLocationId = 'location:pyro-mining-claims';

  const importedRecipes = Array.isArray(imported.recipes) ? imported.recipes : [];
  const importedBlueprints = Array.isArray(imported.blueprints) ? imported.blueprints : [];

  const craftedNameSlugSet = new Set([
    ...((raw.crafting?.blueprints ?? []).map((entry) => slugify(entry.name ?? entry.id))),
    ...importedBlueprints.map((entry) => slugify(entry.name ?? entry.id)),
  ]);

  const inferLocationIdsFromText = (text, locationCandidates) => {
    const normalized = String(text ?? '').toLowerCase();
    if (!normalized) {
      return [];
    }

    return uniqueStrings(
      locationCandidates
        .filter((entry) => {
          const name = String(entry.name ?? '').toLowerCase().trim();
          return name.length > 2 && normalized.includes(name);
        })
        .map((entry) => entry.id),
    );
  };

  const knownLocationBySlug = new Map(
    locations.map((entry) => [slugify(entry.name ?? entry.id), entry.id]),
  );

  const normalizeToKnownLocationIds = (values) =>
    uniqueStrings(
      (values ?? [])
        .map((value) => String(value ?? '').trim())
        .map((value) => {
          if (!value) {
            return null;
          }
          if (knownLocationBySlug.has(slugify(value))) {
            return knownLocationBySlug.get(slugify(value));
          }
          return value;
        })
        .filter(Boolean),
    );

  const inferPurchaseLocationIdsFromText = (text) => {
    const normalized = String(text ?? '').toLowerCase();
    if (!normalized) {
      return [];
    }

    const mentionedStores = uniqueStores.filter((store) => {
      const name = String(store.name ?? '').toLowerCase().trim();
      return name.length > 2 && normalized.includes(name);
    });

    return normalizeToKnownLocationIds(mentionedStores.map((store) => store.locationId));
  };

  const resourcesWithFallbackLocations = resources.map((resource) => {
    const knownLocations = uniqueStrings(resource.knownLocations ?? []);
    const purchaseLocations = uniqueStrings(resource.purchaseLocations ?? []);

    if (knownLocations.length > 0 || purchaseLocations.length > 0) {
      return {
        ...resource,
        knownLocations,
        purchaseLocations,
      };
    }

    const inferredKnownLocations = inferLocationIdsFromText(
      `${resource.liveSummary ?? ''} ${resource.locationNotes ?? ''} ${resource.description ?? ''}`,
      locations,
    );

    if (inferredKnownLocations.length > 0) {
      return {
        ...resource,
        knownLocations: inferredKnownLocations,
        purchaseLocations,
      };
    }

    const mineableByType = Array.isArray(resource.miningMethods) && resource.miningMethods.length > 0;
    const mineableByName = /mine|mining|ore|gem|raw/i.test(`${resource.name ?? ''} ${resource.category ?? ''}`);
    if (mineableByType || mineableByName) {
      return {
        ...resource,
        knownLocations: [miningSourceUnknownLocationId, pyroMiningClaimsLocationId],
        purchaseLocations,
        locationNotes:
          resource.locationNotes ??
          'Mapped to general Stanton and Pyro mining regions when exact public source location is not explicitly documented.',
      };
    }

    return {
      ...resource,
      knownLocations: [miningSourceUnknownLocationId],
      purchaseLocations,
      locationNotes:
        resource.locationNotes ??
        'No explicit public web source location currently mapped. Treated as mining-source unknown until verified.',
    };
  });

  const ensureFallbackLocations = (items) =>
    items.map((item) => {
      const markerText = `${item.liveSummary ?? ''} ${item.description ?? ''} ${item.name ?? ''}`;
      const inferredPurchaseLocations = inferPurchaseLocationIdsFromText(markerText);
      const inferredFoundLocations = inferLocationIdsFromText(markerText, locations);
      const purchaseLocations = normalizeToKnownLocationIds([
        ...(item.purchaseLocations ?? []),
        ...inferredPurchaseLocations,
      ]);
      const foundLocations = normalizeToKnownLocationIds([
        ...(item.foundLocations ?? []),
        ...inferredFoundLocations,
      ]);

      const looksCraftedOnly = craftedNameSlugSet.has(slugify(item.name));
      if (looksCraftedOnly && !foundLocations.includes(craftingLocationId)) {
        foundLocations.push(craftingLocationId);
      }

      if (purchaseLocations.length > 0 || foundLocations.length > 0) {
        return {
          ...item,
          purchaseLocations,
          foundLocations,
        };
      }

      const markerTextLower = markerText.toLowerCase();
      const looksLikeMissionReward = /mission|reward|drop|contract|salvage|quest|dossier/.test(markerTextLower);

      return {
        ...item,
        purchaseLocations: [],
        foundLocations: looksLikeMissionReward
          ? [missionRewardLocationId]
          : looksCraftedOnly
            ? [craftingLocationId]
            : [lootContainerLocationId],
      };
    });

  const convertStoreIdsToLocations = (item, stores) => {
    const vendorMethods = Array.isArray(item.obtainMethods)
      ? item.obtainMethods.filter((m) => m.type === 'vendor' && Array.isArray(m.storeIds))
      : [];

    const storeLocationIds = uniqueStrings(
      vendorMethods.flatMap((method) =>
        (method.storeIds ?? [])
          .map((storeId) => {
            const store = stores.find((s) => s.id === storeId);
            return store?.locationId ? `location:${slugify(store.locationId)}` : null;
          })
          .filter(Boolean),
      ),
    );

    return storeLocationIds.length > 0
      ? {
          ...item,
          purchaseLocations: uniqueStrings([...(item.purchaseLocations ?? []), ...storeLocationIds]),
        }
      : item;
  };

  const weaponsWithStoreLocations = weapons.map((w) => convertStoreIdsToLocations(w, uniqueStores));
  const armorWithStoreLocations = armor.map((a) => convertStoreIdsToLocations(a, uniqueStores));
  const utilityWithStoreLocations = utility.map((u) => convertStoreIdsToLocations(u, uniqueStores));

  const weaponAttachmentVendorLocations = uniqueStrings(
    uniqueStores
      .filter(
        (store) =>
          Array.isArray(store.products) && store.products.some((product) => /weapon_attachments?/i.test(String(product))),
      )
      .map((store) => `location:${slugify(store.locationId)}`),
  );

  const utilityWithAttachmentVendors = utilityWithStoreLocations.map((item) => {
    const itemText = `${item.class ?? ''} ${item.utilityType ?? ''} ${item.name ?? ''}`.toLowerCase();
    const looksLikeWeaponAttachment = /weapon_attachment|attachment|magazine|suppressor|compensator|stabilizer|optic/.test(itemText);
    const hasLocations = (item.purchaseLocations?.length ?? 0) > 0 || (item.foundLocations?.length ?? 0) > 0;

    if (!looksLikeWeaponAttachment || hasLocations || weaponAttachmentVendorLocations.length === 0) {
      return item;
    }

    return {
      ...item,
      purchaseLocations: uniqueStrings([...(item.purchaseLocations ?? []), ...weaponAttachmentVendorLocations]),
    };
  });

  const utilityWithFallbackLocations = ensureFallbackLocations(utilityWithAttachmentVendors);

  const weaponsWithFallbackLocations = ensureFallbackLocations(weaponsWithStoreLocations);
  const armorWithFallbackLocations = ensureFallbackLocations(armorWithStoreLocations).map((item) => {
    const nameSlug = slugify(item.name ?? item.id);
    if (!/^palatino(?:-|$)/.test(nameSlug)) {
      return item;
    }

    return {
      ...item,
      purchaseLocations: [],
      foundLocations: uniqueStrings([...(item.foundLocations ?? []), lootContainerLocationId]),
    };
  });

  const locationsWithFallbacks = [
    ...locations,
    {
      id: unknownMarketLocationId,
      name: 'Stanton Commerce Districts',
      systemId: 'stanton',
      locationType: 'market',
      parent: 'Trade Hubs',
      liveSummary: 'General in-game market fallback used when specific vendor location is not explicitly documented.',
    },
    {
      id: missionRewardLocationId,
      name: 'Mission Reward Locations',
      systemId: 'stanton',
      locationType: 'mission',
      parent: 'Contract Network',
      liveSummary: 'General in-game mission reward fallback used when exact drop location is not explicitly documented.',
    },
    {
      id: lootContainerLocationId,
      name: 'Loot Crates, Outposts, and Data Centers',
      systemId: 'stanton',
      locationType: 'loot',
      parent: 'Ground Site Loot Network',
      liveSummary: 'General found-location fallback for items that are reported as found-only in crates, outposts, or data centers.',
    },
    {
      id: craftingLocationId,
      name: 'Crafting Fabricator Network',
      systemId: 'stanton',
      locationType: 'crafting',
      parent: 'Item Fabricators',
      liveSummary: 'In-game crafting location used for items that are obtainable through crafting blueprints.',
    },
    {
      id: miningSourceUnknownLocationId,
      name: 'Stanton Mining Claims',
      systemId: 'stanton',
      locationType: 'mining',
      parent: 'Open Mining Regions',
      liveSummary: 'General in-game mining region fallback used when exact public source location is not explicitly documented.',
    },
    {
      id: pyroMiningClaimsLocationId,
      name: 'Pyro Mining Claims',
      systemId: 'pyro',
      locationType: 'mining',
      parent: 'Open Mining Regions',
      liveSummary: 'General in-game Pyro mining region fallback used when exact public source location is not explicitly documented.',
    },
  ].filter((value, index, array) => array.findIndex((entry) => entry.id === value.id) === index);

  const recipeDropsByBlueprintId = new Map();
  for (const recipe of importedRecipes) {
    const blueprintIds = Array.isArray(recipe.blueprintIds)
      ? recipe.blueprintIds.map((id) => String(id))
      : recipe.blueprintId
        ? [String(recipe.blueprintId)]
        : [];

    const dropSources = uniqueStrings(
      (Array.isArray(recipe.dropSources) ? recipe.dropSources : []).map((entry) => String(entry).trim()),
    );

    for (const blueprintId of blueprintIds) {
      const current = recipeDropsByBlueprintId.get(blueprintId) ?? [];
      recipeDropsByBlueprintId.set(blueprintId, uniqueStrings([...current, ...dropSources]));
    }
  }

  const blueprints = mergeImportedCollection(raw.crafting?.blueprints ?? [], importedBlueprints, {
    merge: (item, live) => {
      const liveDrops = recipeDropsByBlueprintId.get(String(live.id ?? '')) ?? [];
      const liveHints = uniqueStrings([
        ...(item.acquisitionHints ?? []),
        ...(Array.isArray(live.acquisitionHints) ? live.acquisitionHints : []),
        ...liveDrops,
        ...(Array.isArray(live.tags)
          ? live.tags.filter((tag) => {
              const value = String(tag ?? '').trim();
              if (!value) return false;
              if (/^crafting$/i.test(value) || /^blueprint$/i.test(value)) return false;
              if (/^live-/i.test(value)) return false;
              return true;
            })
          : []),
      ]);

      return {
        ...item,
        craftsCategory: live.craftsCategory ?? live.category ?? item.craftsCategory,
        fabricatorType: live.fabricatorType ?? item.fabricatorType,
        verificationStatus: live.verificationStatus ?? item.verificationStatus,
        acquisitionHints: liveHints,
        sourceRefs: uniqueStrings([
          ...(item.sourceRefs ?? []),
          ...(Array.isArray(live.mergedSources) ? live.mergedSources : []),
          ...(Array.isArray(live.sourceReferences)
            ? live.sourceReferences.map((entry) => String(entry?.source ?? '')).filter(Boolean)
            : []),
        ]),
      };
    },
    create: (live) => {
      const blueprintId = String(live.id ?? `blueprint:${slugify(live.name ?? live.slug ?? 'unknown')}`);
      const liveDrops = recipeDropsByBlueprintId.get(blueprintId) ?? [];
      const acquisitionHints = uniqueStrings([
        ...(Array.isArray(live.acquisitionHints) ? live.acquisitionHints : []),
        ...liveDrops,
        ...(Array.isArray(live.tags)
          ? live.tags.filter((tag) => {
              const value = String(tag ?? '').trim();
              if (!value) return false;
              if (/^crafting$/i.test(value) || /^blueprint$/i.test(value)) return false;
              if (/^live-/i.test(value)) return false;
              return true;
            })
          : []),
      ]);

      return {
        id: blueprintId,
        name: String(live.name ?? formatLabel(blueprintId.replace(/^blueprint:/, ''))),
        craftsCategory: String(live.craftsCategory ?? live.category ?? 'general'),
        acquisitionHints,
        fabricatorType: String(live.fabricatorType ?? 'item_fabricator'),
        verificationStatus: String(live.verificationStatus ?? 'community_verified'),
        sourceRefs: uniqueStrings([
          ...(Array.isArray(live.mergedSources) ? live.mergedSources : []),
          ...(Array.isArray(live.sourceReferences)
            ? live.sourceReferences.map((entry) => String(entry?.source ?? '')).filter(Boolean)
            : []),
        ]),
      };
    },
  });

  const rawRecipes = Array.isArray(raw.crafting?.recipes) ? raw.crafting.recipes : [];
  const normalizedImportedRecipes = importedRecipes.map((entry, index) => {
    const blueprintId = String(
      entry.blueprintId ??
        (Array.isArray(entry.blueprintIds) && entry.blueprintIds[0]) ??
        `blueprint:${slugify(entry.name ?? entry.slug ?? `recipe-${index + 1}`)}`,
    );

    const outputItemId = String(entry.outputItemId ?? entry.outputId ?? slugify(entry.name ?? entry.slug ?? `output-${index + 1}`));
    const ingredients = Array.isArray(entry.ingredients)
      ? entry.ingredients.map((ingredient, ingredientIndex) => {
          const ingredientName = String(ingredient?.name ?? ingredient?.resourceId ?? `resource-${ingredientIndex + 1}`);
          const amountText = String(ingredient?.amount ?? '1').trim();
          const numericMatch = amountText.match(/[0-9]+(?:\.[0-9]+)?/);
          const amount = numericMatch ? Number(numericMatch[0]) : Number(ingredient?.amount ?? 1);
          const normalizedAmount = Number.isFinite(amount) ? amount : 1;
          const unitMatch = amountText.match(/[a-zA-Z]+$/);
          const unit = String(ingredient?.unit ?? unitMatch?.[0] ?? 'unit').toLowerCase();

          return {
            resourceId: String(ingredient?.resourceId ?? slugify(ingredientName)),
            amount: normalizedAmount,
            unit,
          };
        })
      : [];

    return {
      id: String(entry.id ?? `recipe-${index + 1}`),
      blueprintId,
      outputItemId,
      ingredients,
      qualityInputsMatter: Boolean(entry.qualityInputsMatter ?? false),
      verificationStatus: String(entry.verificationStatus ?? 'community_verified'),
      sourceRefs: uniqueStrings([
        ...(Array.isArray(entry.mergedSources) ? entry.mergedSources : []),
        ...(Array.isArray(entry.sourceReferences)
          ? entry.sourceReferences.map((source) => String(source?.source ?? '')).filter(Boolean)
          : []),
      ]),
    };
  });

  const recipeByBlueprintId = new Map(rawRecipes.map((entry) => [String(entry.blueprintId), entry]));
  for (const importedRecipe of normalizedImportedRecipes) {
    const existing = recipeByBlueprintId.get(importedRecipe.blueprintId);
    if (!existing) {
      recipeByBlueprintId.set(importedRecipe.blueprintId, importedRecipe);
      continue;
    }

    recipeByBlueprintId.set(importedRecipe.blueprintId, {
      ...existing,
      ...importedRecipe,
      ingredients: importedRecipe.ingredients.length > 0 ? importedRecipe.ingredients : existing.ingredients,
      sourceRefs: uniqueStrings([...(existing.sourceRefs ?? []), ...(importedRecipe.sourceRefs ?? [])]),
    });
  }

  const recipes = Array.from(recipeByBlueprintId.values());

  return {
    ...raw,
    locations: locationsWithFallbacks,
    stores: uniqueStores,
    resources: resourcesWithFallbackLocations,
    armor: armorWithFallbackLocations,
    weapons: weaponsWithFallbackLocations,
    utility: utilityWithFallbackLocations,
    crafting: {
      ...raw.crafting,
      blueprints,
      recipes,
      overview: {
        ...raw.crafting?.overview,
        blueprintAcquisitionMethods: uniqueStrings(
          blueprints.flatMap((blueprint) => blueprint.acquisitionHints ?? []),
        ),
      },
    },
    meta: {
      ...raw.meta,
      liveImportVersion: imported.meta?.generatedAt ?? null,
    },
  };
}

function getMergedDataset() {
  const raw = mergeImportedData(readRawDataset());
  const storage = readStorage();
  const overrides = storage.uiOverrides ?? {};

  return {
    ...raw,
    meta: {
      ...raw.meta,
      opsAnnouncement: overrides.announcement || undefined,
      adminVerificationNotes: Array.isArray(overrides.verificationNotes) ? overrides.verificationNotes : [],
    },
    uiPresets: {
      ...raw.uiPresets,
      ...(Array.isArray(overrides.featuredResourceIds) ? { featuredResourceIds: overrides.featuredResourceIds } : {}),
      ...(Array.isArray(overrides.featuredArmorIds) ? { featuredArmorIds: overrides.featuredArmorIds } : {}),
      ...(Array.isArray(overrides.featuredWeaponIds) ? { featuredWeaponIds: overrides.featuredWeaponIds } : {}),
      ...(Array.isArray(overrides.featuredStoreIds) ? { featuredStoreIds: overrides.featuredStoreIds } : {}),
    },
  };
}

function getDatasetVersion() {
  ensureStorage();
  return `${statSync(datasetPath).mtimeMs}:${statSync(storagePath).mtimeMs}`;
}

function cachedJson(request, response, compute) {
  const key = `${getDatasetVersion()}:${request.originalUrl}`;
  const cached = responseCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    response.set('Cache-Control', 'public, max-age=15');
    response.set('ETag', cached.etag);
    response.json(cached.payload);
    return;
  }

  const payload = compute();
  const etag = sha256(JSON.stringify(payload));
  responseCache.set(key, { payload, etag, expiresAt: Date.now() + cacheTtlMs });
  response.set('Cache-Control', 'public, max-age=15');
  response.set('ETag', etag);
  response.json(payload);
}

function buildConsoleEntities(data) {
  const resources = data.resources.map((resource) => ({
    id: resource.id,
    name: resource.name,
    type: 'resources',
    category: formatLabel(resource.category),
    summary: resource.locationNotes ?? 'Operational resource record available.',
    verificationStatus: resource.verificationStatus,
    tags: (resource.miningMethods ?? []).map(formatLabel),
  }));

  const armor = data.armor.map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: 'armor',
    category: formatLabel(entry.class),
    summary: `Optimized for ${(entry.recommendedFor ?? []).map(formatLabel).join(', ') || 'field operations'}.`,
    verificationStatus: entry.verificationStatus,
    tags: [formatLabel(entry.class), ...(entry.recommendedFor ?? []).slice(0, 2).map(formatLabel)],
  }));

  const weapons = data.weapons.map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: 'weapons',
    category: formatLabel(entry.class),
    summary: `${formatLabel(entry.damageType)} weapon platform with multiple obtain routes.`,
    verificationStatus: entry.verificationStatus,
    tags: [formatLabel(entry.class), formatLabel(entry.damageType)],
  }));

  const utility = (data.utility ?? []).map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: 'utility',
    category: formatLabel(entry.class),
    summary: entry.liveSummary ?? `${formatLabel(entry.utilityType)} utility item for specialist loadouts.`,
    verificationStatus: entry.verificationStatus,
    tags: [formatLabel(entry.class), formatLabel(entry.utilityType)],
  }));

  const locations = data.locations.map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: 'locations',
    category: formatLabel(entry.locationType),
    summary: `${formatLabel(entry.locationType)} in ${formatLabel(entry.systemId)}${entry.parent ? `, parent ${entry.parent}` : ''}.`,
    verificationStatus: 'verified',
    tags: [formatLabel(entry.systemId), formatLabel(entry.locationType)],
  }));

  const crafting = data.crafting.blueprints.map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: 'crafting',
    category: formatLabel(entry.craftsCategory),
    summary: `Fabricator-ready blueprint for ${formatLabel(entry.craftsCategory)} production.`,
    verificationStatus: entry.verificationStatus,
    tags: entry.acquisitionHints.map(formatLabel),
  }));

  return [...resources, ...armor, ...weapons, ...utility, ...locations, ...crafting];
}

function buildAssistantResponse(query, entities) {
  const normalized = query.toLowerCase();
  const matches = entities
    .filter((entry) => `${entry.name} ${entry.category} ${entry.summary} ${entry.tags.join(' ')}`.toLowerCase().includes(normalized))
    .slice(0, 6);

  if (matches.length === 0) {
    return {
      query,
      response: 'No direct record matches found. Try a location name, item class, or verification term like verified or partial.',
      matches: [],
    };
  }

  const types = Array.from(new Set(matches.map((entry) => entry.type))).map(formatLabel).join(', ');
  return {
    query,
    response: `Found ${matches.length} relevant records across ${types}. Open a linked dossier to inspect locations, verification status, and related operational data.`,
    matches,
  };
}

function toSearchText(item, fields) {
  return fields
    .flatMap((field) => {
      const value = item[field];
      if (Array.isArray(value)) {
        return value;
      }
      if (value && typeof value === 'object') {
        return Object.values(value);
      }
      return value ?? [];
    })
    .join(' ')
    .toLowerCase();
}

function paginate(items, request, config) {
  const page = Math.max(1, Number(request.query.page ?? 1));
  const pageSize = Math.max(1, Math.min(Number(request.query.pageSize ?? 24), 100));
  const query = String(request.query.q ?? '').trim().toLowerCase();
  const verification = String(request.query.verification ?? '').trim();
  const sortBy = String(request.query.sortBy ?? config.sortKeys[0]);
  const sortDir = String(request.query.sortDir ?? 'asc') === 'desc' ? 'desc' : 'asc';

  let results = [...items];

  if (verification) {
    results = results.filter((item) => item.verificationStatus === verification);
  }

  if (query) {
    results = results.filter((item) => toSearchText(item, config.searchFields).includes(query));
  }

  if (config.sortKeys.includes(sortBy)) {
    results.sort((left, right) => {
      const leftValue = String(left[sortBy] ?? '').toLowerCase();
      const rightValue = String(right[sortBy] ?? '').toLowerCase();
      return sortDir === 'desc' ? rightValue.localeCompare(leftValue) : leftValue.localeCompare(rightValue);
    });
  }

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    results: results.slice(offset, offset + pageSize),
  };
}

function getBearerToken(request) {
  const header = request.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' ? token : null;
}

function getSessionUser(token) {
  if (!token) {
    return null;
  }

  const storage = readStorage();
  const session = storage.sessions.find((entry) => entry.token === token);
  if (!session) {
    return null;
  }

  const user = storage.adminUsers.find((entry) => entry.id === session.userId);
  if (!user) {
    return null;
  }

  return { user, storage };
}

function requireAdmin(request, response, next) {
  const auth = getSessionUser(getBearerToken(request));

  if (!auth) {
    response.status(401).json({ error: 'Admin authentication required' });
    return;
  }

  request.admin = auth.user;
  request.storage = auth.storage;
  next();
}

const app = express();

ensureStorage();
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', (request, response) => {
  const username = String(request.body?.username ?? '').trim();
  const password = String(request.body?.password ?? '');
  const storage = readStorage();
  const user = storage.adminUsers.find((entry) => entry.username === username);

  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    response.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + sessionTtlMs).toISOString();
  storage.sessions.push({ token, userId: user.id, expiresAt });
  appendAudit(storage, user.username, 'login');
  writeStorage(storage);

  response.json({ token, user: { id: user.id, username: user.username }, expiresAt });
});

app.get('/api/auth/me', (request, response) => {
  const auth = getSessionUser(getBearerToken(request));

  if (!auth) {
    response.status(401).json({ error: 'Not authenticated' });
    return;
  }

  response.json({ user: { id: auth.user.id, username: auth.user.username } });
});

app.post('/api/auth/logout', requireAdmin, (request, response) => {
  const token = getBearerToken(request);
  const storage = request.storage;
  storage.sessions = storage.sessions.filter((session) => session.token !== token);
  appendAudit(storage, request.admin.username, 'logout');
  writeStorage(storage);
  response.json({ ok: true });
});

app.get('/api/dataset', (request, response) => {
  cachedJson(request, response, () => getMergedDataset());
});

app.get('/api/summary', (request, response) => {
  cachedJson(request, response, () => {
    const data = getMergedDataset();
    return {
      meta: data.meta,
      systems: data.gameSystems,
      counts: {
        locations: data.locations.length,
        stores: data.stores.length,
        resources: data.resources.length,
        armor: data.armor.length,
        weapons: data.weapons.length,
        utility: (data.utility ?? []).length,
        blueprints: data.crafting.blueprints.length,
        recipes: data.crafting.recipes.length,
      },
    };
  });
});

app.get('/api/entities', (request, response) => {
  cachedJson(request, response, () => {
    const data = getMergedDataset();
    const entities = buildConsoleEntities(data);
    const type = String(request.query.type ?? '').trim();
    const query = String(request.query.q ?? '').trim().toLowerCase();
    const verification = String(request.query.verification ?? '').trim();
    const page = Math.max(1, Number(request.query.page ?? 1));
    const pageSize = Math.max(1, Math.min(Number(request.query.pageSize ?? 24), 100));

    let results = entities;

    if (type) {
      if (type === 'mining') {
        const miningIds = new Set(data.resources.filter((entry) => (entry.miningMethods?.length ?? 0) > 0).map((entry) => entry.id));
        results = results.filter((entry) => entry.type === 'resources' && miningIds.has(entry.id));
      } else {
        results = results.filter((entry) => entry.type === type);
      }
    }

    if (verification) {
      results = results.filter((entry) => entry.verificationStatus === verification);
    }

    if (query) {
      results = results.filter((entry) => `${entry.name} ${entry.category} ${entry.summary} ${entry.tags.join(' ')}`.toLowerCase().includes(query));
    }

    const total = results.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;

    return {
      page: safePage,
      pageSize,
      total,
      totalPages,
      results: results.slice(offset, offset + pageSize),
    };
  });
});

for (const [collectionName, config] of Object.entries(collectionConfigs)) {
  app.get(`/api/${collectionName}`, (request, response) => {
    cachedJson(request, response, () => paginate(config.getItems(getMergedDataset()), request, config));
  });

  app.get(`/api/${collectionName}/:id`, (request, response) => {
    cachedJson(request, response, () => {
      const item = config.findById(getMergedDataset(), request.params.id);

      if (!item) {
        response.status(404);
        return { error: `${collectionName.slice(0, -1)} not found` };
      }

      return item;
    });
  });
}

app.get('/api/assistant/prompts', (_request, response) => {
  response.json({
    prompts: [
      'Show verified mining resources for Daymar',
      'What armor is best for FPS mining?',
      'List weapon records with crafting paths',
      'Find stations with equipment vendors',
    ],
  });
});

app.post('/api/assistant/query', (request, response) => {
  const query = String(request.body?.query ?? '').trim().slice(0, 160);

  if (!query) {
    response.status(400).json({ error: 'Query is required' });
    return;
  }

  const entities = buildConsoleEntities(getMergedDataset());
  response.json(buildAssistantResponse(query, entities));
});

app.get('/api/admin/state', requireAdmin, (request, response) => {
  const storage = request.storage;
  response.json({
    uiOverrides: storage.uiOverrides,
    auditLog: storage.auditLog.slice(0, 20),
    defaultAdminUsername: getDefaultAdminCredentials().username,
    storage: getStorageSummary(storage),
  });
});

app.get('/api/admin/users', requireAdmin, (request, response) => {
  const users = request.storage.adminUsers.map((user) => ({
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
  }));

  response.json({ users });
});

app.post('/api/admin/users', requireAdmin, (request, response) => {
  const storage = request.storage;
  const username = sanitizeUsername(request.body?.username);
  const password = String(request.body?.password ?? '');

  if (!username) {
    response.status(400).json({ error: 'Username is required and must contain only letters, numbers, dots, dashes, or underscores.' });
    return;
  }

  if (!validatePassword(password)) {
    response.status(400).json({ error: 'Password must be at least 10 characters.' });
    return;
  }

  if (storage.adminUsers.some((entry) => entry.username === username)) {
    response.status(409).json({ error: 'An admin user with that username already exists.' });
    return;
  }

  const salt = randomBytes(16).toString('hex');
  const user = {
    id: randomUUID(),
    username,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };

  storage.adminUsers.push(user);
  appendAudit(storage, request.admin.username, 'create_admin_user', { username });
  writeStorage(storage);

  response.status(201).json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    },
  });
});

app.put('/api/admin/users/:id/password', requireAdmin, (request, response) => {
  const storage = request.storage;
  const password = String(request.body?.password ?? '');

  if (!validatePassword(password)) {
    response.status(400).json({ error: 'Password must be at least 10 characters.' });
    return;
  }

  const user = storage.adminUsers.find((entry) => entry.id === request.params.id);

  if (!user) {
    response.status(404).json({ error: 'Admin user not found.' });
    return;
  }

  const salt = randomBytes(16).toString('hex');
  user.salt = salt;
  user.passwordHash = hashPassword(password, salt);
  storage.sessions = storage.sessions.filter((session) => session.userId !== user.id);
  appendAudit(storage, request.admin.username, 'rotate_admin_password', { username: user.username });
  writeStorage(storage);

  response.json({ ok: true });
});

app.get('/api/admin/storage/export', requireAdmin, (request, response) => {
  const storage = request.storage;
  response.json({
    exportedAt: new Date().toISOString(),
    storage: {
      version: storage.version,
      adminUsers: storage.adminUsers.map((user) => ({
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      })),
      sessions: storage.sessions.map((session) => ({
        userId: session.userId,
        expiresAt: session.expiresAt,
      })),
      uiOverrides: storage.uiOverrides,
      auditLog: storage.auditLog,
    },
    summary: getStorageSummary(storage),
  });
});

app.put('/api/admin/state', requireAdmin, (request, response) => {
  const storage = request.storage;
  const nextOverrides = request.body ?? {};
  const sanitizeList = (value) =>
    Array.isArray(value)
      ? value
          .map((entry) => String(entry).trim())
          .filter(Boolean)
          .slice(0, 12)
      : null;

  storage.uiOverrides = {
    ...storage.uiOverrides,
    featuredResourceIds: sanitizeList(nextOverrides.featuredResourceIds),
    featuredArmorIds: sanitizeList(nextOverrides.featuredArmorIds),
    featuredWeaponIds: sanitizeList(nextOverrides.featuredWeaponIds),
    featuredStoreIds: sanitizeList(nextOverrides.featuredStoreIds),
    announcement: String(nextOverrides.announcement ?? '').trim().slice(0, 240),
    verificationNotes: Array.isArray(nextOverrides.verificationNotes)
      ? nextOverrides.verificationNotes.map((entry) => String(entry).trim()).filter(Boolean).slice(0, 10)
      : [],
  };

  appendAudit(storage, request.admin.username, 'update_ui_overrides', {
    counts: {
      resources: storage.uiOverrides.featuredResourceIds?.length ?? 0,
      armor: storage.uiOverrides.featuredArmorIds?.length ?? 0,
      weapons: storage.uiOverrides.featuredWeaponIds?.length ?? 0,
      stores: storage.uiOverrides.featuredStoreIds?.length ?? 0,
    },
  });
  writeStorage(storage);

  response.json({ ok: true, uiOverrides: storage.uiOverrides });
});

if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/).*/, (_request, response) => {
    response.sendFile(path.join(distDir, 'index.html'));
  });
}

function runCatalogSync(trigger) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'sync:catalog'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`[auto-sync] Completed ${trigger} catalog refresh.`);
        resolve();
        return;
      }

      reject(new Error(`[auto-sync] ${trigger} catalog refresh failed with exit code ${code ?? 'unknown'}`));
    });
  });
}

function scheduleAutoSync() {
  const enabled = String(process.env.STAROPS_AUTO_SYNC_ENABLED ?? 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('[auto-sync] Disabled via STAROPS_AUTO_SYNC_ENABLED=false.');
    return;
  }

  let isRunning = false;

  const runIfIdle = async (trigger) => {
    if (isRunning) {
      console.log(`[auto-sync] Skipping ${trigger}; previous sync is still running.`);
      return;
    }

    isRunning = true;
    const startedAt = new Date().toISOString();
    console.log(`[auto-sync] Starting ${trigger} catalog refresh at ${startedAt}.`);

    try {
      await runCatalogSync(trigger);
      responseCache.clear();
    } catch (error) {
      console.error(error instanceof Error ? error.message : '[auto-sync] Catalog refresh failed.');
    } finally {
      isRunning = false;
    }
  };

  const runOnBoot = String(process.env.STAROPS_AUTO_SYNC_ON_BOOT ?? 'false').toLowerCase() === 'true';
  if (runOnBoot) {
    void runIfIdle('startup');
  }

  setInterval(() => {
    void runIfIdle('scheduled');
  }, autoSyncIntervalMs);

  const nextRunAt = new Date(Date.now() + autoSyncIntervalMs).toISOString();
  console.log(`[auto-sync] Scheduled catalog refresh every 12 hours. Next run at ${nextRunAt}.`);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Star Ops backend listening on http://0.0.0.0:${port}`);
  scheduleAutoSync();
});