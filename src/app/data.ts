type VerificationStatus = string;

export type Location = {
  id: string;
  name: string;
  systemId: string;
  locationType: string;
  parent?: string;
  liveSummary?: string;
};

export type Store = {
  id: string;
  name: string;
  category: string;
  locationId: string;
  subLocation?: string;
  products: string[];
  verificationStatus: VerificationStatus;
  liveSummary?: string;
};

export type Resource = {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  miningMethods?: string[];
  requiredToolOrVehicleIds?: string[];
  knownLocations?: string[];
  purchaseLocations?: string[];
  locationNotes?: string;
  liveSummary?: string;
  verificationStatus: VerificationStatus;
};

export type Armor = {
  id: string;
  name: string;
  class: string;
  imageUrl?: string;
  manufacturer?: string;
  recommendedFor?: string[];
  inventoryMicroSCU?: number;
  temperatureC?: { min: number; max: number };
  purchaseLocations?: string[];
  foundLocations?: string[];
  liveSummary?: string;
  verificationStatus: VerificationStatus;
};

export type Weapon = {
  id: string;
  name: string;
  class: string;
  damageType: string;
  imageUrl?: string;
  purchaseLocations?: string[];
  foundLocations?: string[];
  liveSummary?: string;
  verificationStatus: VerificationStatus;
};

export type Utility = {
  id: string;
  name: string;
  class: string;
  utilityType: string;
  purchaseLocations?: string[];
  foundLocations?: string[];
  liveSummary?: string;
  verificationStatus: VerificationStatus;
};

export type Blueprint = {
  id: string;
  name: string;
  craftsCategory: string;
  acquisitionHints: string[];
  fabricatorType: string;
  verificationStatus: VerificationStatus;
};

export type Recipe = {
  id: string;
  blueprintId: string;
  outputItemId: string;
  ingredients: Array<{
    resourceId: string;
    amount: number;
    unit: string;
  }>;
  qualityInputsMatter: boolean;
  verificationStatus: VerificationStatus;
};

export type MasterDataset = {
  meta: {
    appName: string;
    generatedOn: string;
    gameVersionTarget: string;
    notes: string[];
    opsAnnouncement?: string;
    adminVerificationNotes?: string[];
  };
  gameSystems: Array<{ id: string; name: string }>;
  locations: Location[];
  stores: Store[];
  resources: Resource[];
  armor: Armor[];
  weapons: Weapon[];
  utility: Utility[];
  crafting: {
    overview: {
      requiresBlueprints: boolean;
      requiresFabricator: boolean;
      materialQualityAffectsOutput: boolean;
      blueprintAcquisitionMethods: string[];
      notes: string[];
      verificationStatus: VerificationStatus;
    };
    blueprints: Blueprint[];
    recipes: Recipe[];
  };
  uiPresets: {
    featuredResourceIds: string[];
    featuredArmorIds: string[];
    featuredWeaponIds: string[];
    featuredStoreIds: string[];
  };
};

export type ExportedAppSnapshot = {
  meta: {
    generatedAt: string;
    sourceCount: number;
    notes: string[];
  };
  systems?: Array<{ id?: string; slug?: string; name: string }>;
  locations?: Array<Record<string, unknown>>;
  resources?: Array<Record<string, unknown>>;
  miningMethods?: Array<Record<string, unknown>>;
  tools?: Array<Record<string, unknown>>;
  vehicles?: Array<Record<string, unknown>>;
  vendors?: Array<Record<string, unknown>>;
  lootSources?: Array<Record<string, unknown>>;
  blueprints?: Array<Record<string, unknown>>;
  recipes?: Array<Record<string, unknown>>;
  weapons?: Array<Record<string, unknown>>;
  armor?: Array<Record<string, unknown>>;
  utility?: Array<Record<string, unknown>>;
};

export type EntityType = 'resources' | 'mining' | 'crafting' | 'blueprints' | 'weapons' | 'armor' | 'utility' | 'locations';

export type ConsoleEntity = {
  id: string;
  name: string;
  type: Exclude<EntityType, 'mining'>;
  category: string;
  imageUrl?: string;
  summary: string;
  verificationStatus: string;
  tags: string[];
  metadata: Array<{ label: string; value: string }>;
  relatedIds: string[];
};

export type RelatedEntity = ConsoleEntity | Location | Store;

export type AppModel = {
  data: MasterDataset;
  consoleEntities: ConsoleEntity[];
  featuredCards: {
    resources: ConsoleEntity[];
    armor: ConsoleEntity[];
    weapons: ConsoleEntity[];
    stores: Store[];
  };
  stats: Array<{ label: string; value: number; tone: 'cyan' | 'blue' | 'teal' | 'amber' }>;
  getLocationName: (locationId: string) => string;
  getStoreName: (storeId: string) => string;
  findEntity: (type: string, id: string) => ConsoleEntity | undefined;
  getEntitiesByType: (type: string) => ConsoleEntity[];
  getBlueprintRecipe: (blueprintId: string) => Recipe | undefined;
  getLocationStores: (locationId: string) => Store[];
  getEntityLinks: (entity: ConsoleEntity) => RelatedEntity[];
};

export const formatLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

export const navigationSections: Array<{ id: EntityType | 'home' | 'assistant' | 'admin'; label: string; description: string }> = [
  { id: 'home', label: 'Home', description: 'Dashboard and tactical overview' },
  { id: 'resources', label: 'Resources', description: 'Harvestables and materials' },
  { id: 'mining', label: 'Mining', description: 'Ore, extraction, and routes' },
  { id: 'blueprints', label: 'Blueprints', description: 'Blueprint index and mission acquisition paths' },
  { id: 'crafting', label: 'Crafting', description: 'Blueprints and recipes' },
  { id: 'weapons', label: 'Weapons', description: 'Combat equipment registry' },
  { id: 'armor', label: 'Armour', description: 'Suit and loadout records' },
  { id: 'utility', label: 'Utility', description: 'Attachments, support gear, and specialist tools' },
  { id: 'locations', label: 'Locations', description: 'Stations, cities, and outposts' },
  { id: 'assistant', label: 'Assistant', description: 'Operations support panel' },
  { id: 'admin', label: 'Admin', description: 'Secure overrides and tooling' },
];

export const primaryBrowseSections = navigationSections.filter((entry) =>
  ['mining', 'blueprints', 'crafting', 'armor', 'weapons', 'utility'].includes(entry.id),
);

export function buildAppModel(data: MasterDataset): AppModel {
  const locationMap = new Map(data.locations.map((entry) => [entry.id, entry]));
  const storeMap = new Map(data.stores.map((entry) => [entry.id, entry]));

  const getLocationName = (locationId: string) => locationMap.get(locationId)?.name ?? formatLabel(locationId);
  const getStoreName = (storeId: string) => storeMap.get(storeId)?.name ?? formatLabel(storeId);

  const resourceEntities: ConsoleEntity[] = data.resources.map((resource) => ({
    id: resource.id,
    name: resource.name,
    type: 'resources',
    category: formatLabel(resource.category),
    imageUrl: resource.imageUrl,
    summary: resource.liveSummary ?? resource.locationNotes ?? 'Operational resource record available.',
    verificationStatus: resource.verificationStatus,
    tags: [...(resource.miningMethods ?? []).map(formatLabel)],
    metadata: [
      { label: 'Category', value: formatLabel(resource.category) },
      { label: 'Mining', value: resource.miningMethods?.map(formatLabel).join(', ') || 'Unknown' },
      { label: 'Locations', value: String(resource.knownLocations?.length ?? 0) },
      { label: 'Buy At', value: String(resource.purchaseLocations?.length ?? 0) },
    ],
    relatedIds: [...(resource.knownLocations ?? []), ...(resource.purchaseLocations ?? []), ...(resource.requiredToolOrVehicleIds ?? [])],
  }));

  const armorEntities: ConsoleEntity[] = data.armor.map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: 'armor',
    category: formatLabel(entry.class),
    imageUrl: entry.imageUrl,
    summary: entry.liveSummary ?? `Optimized for ${entry.recommendedFor?.map(formatLabel).join(', ') || 'field operations'}.`,
    verificationStatus: entry.verificationStatus,
    tags: [formatLabel(entry.class), ...(entry.recommendedFor ?? []).slice(0, 2).map(formatLabel)],
    metadata: [
      { label: 'Class', value: formatLabel(entry.class) },
      { label: 'Maker', value: entry.manufacturer ?? 'Unknown' },
      { label: 'Buy At', value: String(entry.purchaseLocations?.length ?? 0) },
      {
        label: 'Temperature',
        value: entry.temperatureC ? `${entry.temperatureC.min} to ${entry.temperatureC.max} C` : 'No data',
      },
    ],
    relatedIds: [...(entry.purchaseLocations ?? []), ...(entry.foundLocations ?? [])],
  }));

  const weaponEntities: ConsoleEntity[] = data.weapons.map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: 'weapons',
    category: formatLabel(entry.class),
    imageUrl: entry.imageUrl,
    summary: entry.liveSummary ?? `${formatLabel(entry.damageType)} weapon platform with multiple obtain routes.`,
    verificationStatus: entry.verificationStatus,
    tags: [formatLabel(entry.class), formatLabel(entry.damageType)],
    metadata: [
      { label: 'Class', value: formatLabel(entry.class) },
      { label: 'Damage', value: formatLabel(entry.damageType) },
      { label: 'Buy At', value: String(entry.purchaseLocations?.length ?? 0) },
      { label: 'Status', value: formatLabel(entry.verificationStatus) },
    ],
    relatedIds: [...(entry.purchaseLocations ?? []), ...(entry.foundLocations ?? [])],
  }));

  const utilityEntities: ConsoleEntity[] = data.utility.map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: 'utility',
    category: formatLabel(entry.class),
    summary: entry.liveSummary ?? 'Support gear and attachments for specialist loadouts.',
    verificationStatus: entry.verificationStatus,
    tags: [formatLabel(entry.class), formatLabel(entry.utilityType)],
    metadata: [
      { label: 'Category', value: formatLabel(entry.class) },
      { label: 'Type', value: formatLabel(entry.utilityType) },
      { label: 'Buy At', value: String(entry.purchaseLocations?.length ?? 0) },
      { label: 'Status', value: formatLabel(entry.verificationStatus) },
    ],
    relatedIds: [...(entry.purchaseLocations ?? []), ...(entry.foundLocations ?? [])],
  }));

  const locationEntities: ConsoleEntity[] = data.locations.map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: 'locations',
    category: formatLabel(entry.locationType),
    summary: entry.liveSummary ?? `${formatLabel(entry.locationType)} in ${formatLabel(entry.systemId)}${entry.parent ? `, parent ${entry.parent}` : ''}.`,
    verificationStatus: 'verified',
    tags: [formatLabel(entry.systemId), formatLabel(entry.locationType)],
    metadata: [
      { label: 'System', value: formatLabel(entry.systemId) },
      { label: 'Type', value: formatLabel(entry.locationType) },
      { label: 'Parent', value: entry.parent ?? 'None' },
    ],
    relatedIds: data.stores.filter((store) => store.locationId === entry.id).map((store) => store.id),
  }));

  const blueprintEntities: ConsoleEntity[] = data.crafting.blueprints.map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: 'blueprints',
    category: formatLabel(entry.craftsCategory),
    summary: `Fabricator-ready blueprint for ${formatLabel(entry.craftsCategory)} production.`,
    verificationStatus: entry.verificationStatus,
    tags: entry.acquisitionHints.map(formatLabel),
    metadata: [
      { label: 'Fabricator', value: formatLabel(entry.fabricatorType) },
      { label: 'Category', value: formatLabel(entry.craftsCategory) },
      { label: 'Acquire', value: entry.acquisitionHints.map(formatLabel).join(', ') },
    ],
    relatedIds: data.crafting.recipes.filter((recipe) => recipe.blueprintId === entry.id).map((recipe) => recipe.outputItemId),
  }));

  const recipeByBlueprintId = new Map(data.crafting.recipes.map((entry) => [entry.blueprintId, entry]));

  const craftingEntities: ConsoleEntity[] = data.crafting.recipes.map((recipe) => {
    const blueprint = data.crafting.blueprints.find((entry) => entry.id === recipe.blueprintId);
    const ingredientLabels = recipe.ingredients.map((ingredient) => formatLabel(ingredient.resourceId));
    const ingredientChips = recipe.ingredients.slice(0, 3).map((ingredient) => {
      const amount = Number.isFinite(ingredient.amount) ? ingredient.amount : String(ingredient.amount);
      return `${formatLabel(ingredient.resourceId)} ${amount} ${ingredient.unit}`.trim();
    });

    return {
      id: recipe.blueprintId,
      name: formatLabel(recipe.outputItemId),
      type: 'crafting',
      category: blueprint ? formatLabel(blueprint.craftsCategory) : 'Craftable Item',
      summary: `Craftable item requiring ${recipe.ingredients.length} resources.`,
      verificationStatus: recipe.verificationStatus,
      tags: ingredientChips,
      metadata: [
        { label: 'Blueprint', value: blueprint?.name ?? formatLabel(recipe.blueprintId) },
        {
          label: 'Acquire',
          value: blueprint?.acquisitionHints.map(formatLabel).join(', ') || 'Mission or exploration rewards',
        },
        { label: 'Resources', value: ingredientLabels.join(', ') || 'Unknown' },
        { label: 'Ingredients', value: String(recipe.ingredients.length) },
      ],
      relatedIds: [recipe.outputItemId, ...recipe.ingredients.map((ingredient) => ingredient.resourceId)],
    };
  });

  const consoleEntities: ConsoleEntity[] = [
    ...resourceEntities,
    ...armorEntities,
    ...weaponEntities,
    ...utilityEntities,
    ...locationEntities,
    ...blueprintEntities,
    ...craftingEntities,
  ];

  const miningEntityIds = new Set(
    data.resources
      .filter((resource) => {
        const hasMiningMethods = (resource.miningMethods?.length ?? 0) > 0;
        const knownAsMineable = /mine|mining|ore|gem|raw|quantanium|hadanite|janalite|taranite|bexalite|borase|agricium/i.test(
          `${resource.name ?? ''} ${resource.category ?? ''} ${resource.locationNotes ?? ''}`,
        );

        return hasMiningMethods || knownAsMineable;
      })
      .map((resource) => resource.id),
  );

  const getEntitiesByType = (type: string) => {
    if (type === 'mining') {
      return resourceEntities.filter((entry) => miningEntityIds.has(entry.id));
    }

    if (type === 'resources') {
      return resourceEntities;
    }

    if (type === 'blueprints') {
      return blueprintEntities;
    }

    return consoleEntities.filter((entry) => entry.type === type);
  };

  const findEntity = (type: string, id: string) => {
    if (type === 'mining') {
      const entry = resourceEntities.find((resource) => resource.id === id);
      return entry && miningEntityIds.has(entry.id) ? entry : undefined;
    }

    if (type === 'resources') {
      return resourceEntities.find((entry) => entry.id === id);
    }

    if (type === 'blueprints') {
      return blueprintEntities.find((entry) => entry.id === id);
    }

    return consoleEntities.find((entry) => entry.type === type && entry.id === id);
  };

  const getBlueprintRecipe = (blueprintId: string) => recipeByBlueprintId.get(blueprintId);
  const getLocationStores = (locationId: string) => data.stores.filter((store) => store.locationId === locationId);

  const getEntityLinks = (entity: ConsoleEntity) => {
    const related: RelatedEntity[] = [];

    for (const relatedId of entity.relatedIds) {
      const match =
        consoleEntities.find((entry) => entry.id === relatedId) ??
        locationMap.get(relatedId) ??
        storeMap.get(relatedId);

      if (match) {
        related.push(match as RelatedEntity);
      }
    }

    return related;
  };

  const featuredCards = {
    resources: data.uiPresets.featuredResourceIds
      .map((id) => consoleEntities.find((entry) => entry.id === id))
      .filter((entry): entry is ConsoleEntity => Boolean(entry)),
    armor: data.uiPresets.featuredArmorIds
      .map((id) => consoleEntities.find((entry) => entry.id === id))
      .filter((entry): entry is ConsoleEntity => Boolean(entry)),
    weapons: data.uiPresets.featuredWeaponIds
      .map((id) => consoleEntities.find((entry) => entry.id === id))
      .filter((entry): entry is ConsoleEntity => Boolean(entry)),
    stores: data.uiPresets.featuredStoreIds.map((id) => storeMap.get(id)).filter((entry): entry is Store => Boolean(entry)),
  };

  const stats: AppModel['stats'] = [
    { label: 'Mining', value: miningEntityIds.size, tone: 'cyan' },
    { label: 'Crafting', value: data.crafting.blueprints.length, tone: 'blue' },
    { label: 'Armour', value: data.armor.length, tone: 'teal' },
    { label: 'Utility', value: utilityEntities.length, tone: 'amber' },
  ];

  return {
    data,
    consoleEntities,
    featuredCards,
    stats,
    getLocationName,
    getStoreName,
    findEntity,
    getEntitiesByType,
    getBlueprintRecipe,
    getLocationStores,
    getEntityLinks,
  };
}

export function buildModelFromExportedSnapshot(snapshot: ExportedAppSnapshot): AppModel {
  const resources: Resource[] = (snapshot.resources ?? []).map((entry, index) => ({
    id: String(entry.id ?? entry.slug ?? `resource-${index + 1}`),
    name: String(entry.name ?? `Resource ${index + 1}`),
    category: String(entry.category ?? 'imported_resource'),
    imageUrl: entry.imageUrl ? String(entry.imageUrl) : undefined,
    miningMethods: Array.isArray(entry.miningMethods)
      ? entry.miningMethods.map((item) => String(item))
      : Array.isArray(entry.environments)
        ? entry.environments.map((item) => String(item))
        : [],
    locationNotes: String(entry.description ?? entry.sourceNotes ?? 'Imported snapshot resource.'),
    verificationStatus: String(entry.verificationStatus ?? 'snapshot_imported'),
  }));

  const armor: Armor[] = (snapshot.armor ?? []).map((entry, index) => ({
    id: String(entry.id ?? entry.slug ?? `armor-${index + 1}`),
    name: String(entry.name ?? `Armor ${index + 1}`),
    class: String(entry.class ?? entry.category ?? 'unknown'),
    imageUrl: entry.imageUrl ? String(entry.imageUrl) : undefined,
    manufacturer: entry.manufacturer ? String(entry.manufacturer) : undefined,
    recommendedFor: Array.isArray(entry.recommendedFor) ? entry.recommendedFor.map((item) => String(item)) : [],
    verificationStatus: String(entry.verificationStatus ?? 'snapshot_imported'),
  }));

  const weapons: Weapon[] = (snapshot.weapons ?? []).map((entry, index) => ({
    id: String(entry.id ?? entry.slug ?? `weapon-${index + 1}`),
    name: String(entry.name ?? `Weapon ${index + 1}`),
    class: String(entry.class ?? entry.category ?? 'unknown'),
    damageType: String(entry.damageType ?? 'unknown'),
    imageUrl: entry.imageUrl ? String(entry.imageUrl) : undefined,
    verificationStatus: String(entry.verificationStatus ?? 'snapshot_imported'),
  }));

  const utility: Utility[] = (snapshot.utility ?? snapshot.tools ?? []).map((entry, index) => ({
    id: String(entry.id ?? entry.slug ?? `utility-${index + 1}`),
    name: String(entry.name ?? `Utility ${index + 1}`),
    class: String(entry.class ?? entry.category ?? 'utility'),
    utilityType: String(entry.utilityType ?? entry.type ?? entry.damageType ?? 'support'),
    verificationStatus: String(entry.verificationStatus ?? 'snapshot_imported'),
  }));

  const locations: Location[] = (snapshot.locations ?? []).map((entry, index) => ({
    id: String(entry.id ?? entry.slug ?? `location-${index + 1}`),
    name: String(entry.name ?? `Location ${index + 1}`),
    systemId: String(entry.systemId ?? entry.system ?? 'unknown'),
    locationType: String(entry.locationType ?? entry.type ?? 'location'),
    parent: entry.parent ? String(entry.parent) : undefined,
  }));

  const stores: Store[] = (snapshot.vendors ?? []).map((entry, index) => ({
    id: String(entry.id ?? entry.slug ?? `vendor-${index + 1}`),
    name: String(entry.name ?? `Vendor ${index + 1}`),
    category: String(entry.category ?? 'vendor'),
    locationId: String(entry.locationId ?? entry.location ?? 'unknown'),
    subLocation: entry.subLocation ? String(entry.subLocation) : undefined,
    products: Array.isArray(entry.products) ? entry.products.map((item) => String(item)) : [],
    verificationStatus: String(entry.verificationStatus ?? 'snapshot_imported'),
  }));

  const blueprints: Blueprint[] = (snapshot.blueprints ?? []).map((entry, index) => ({
    id: String(entry.id ?? entry.slug ?? `blueprint-${index + 1}`),
    name: String(entry.name ?? `Blueprint ${index + 1}`),
    craftsCategory: String(entry.craftsCategory ?? entry.category ?? 'general'),
    acquisitionHints: Array.isArray(entry.acquisitionHints) ? entry.acquisitionHints.map((item) => String(item)) : [],
    fabricatorType: String(entry.fabricatorType ?? 'item_fabricator'),
    verificationStatus: String(entry.verificationStatus ?? 'snapshot_imported'),
  }));

  const recipes: Recipe[] = (snapshot.recipes ?? []).map((entry, index) => ({
    id: String(entry.id ?? `recipe-${index + 1}`),
    blueprintId: String(entry.blueprintId ?? `blueprint-${index + 1}`),
    outputItemId: String(entry.outputItemId ?? entry.outputId ?? `output-${index + 1}`),
    ingredients: Array.isArray(entry.ingredients)
      ? entry.ingredients.map((ingredient, ingredientIndex) => ({
          resourceId: String((ingredient as Record<string, unknown>).resourceId ?? `resource-${ingredientIndex + 1}`),
          amount: Number((ingredient as Record<string, unknown>).amount ?? 1),
          unit: String((ingredient as Record<string, unknown>).unit ?? 'unit'),
        }))
      : [],
    qualityInputsMatter: Boolean(entry.qualityInputsMatter ?? false),
    verificationStatus: String(entry.verificationStatus ?? 'snapshot_imported'),
  }));

  const normalized: MasterDataset = {
    meta: {
      appName: 'Star Ops Item Finder',
      generatedOn: snapshot.meta.generatedAt,
      gameVersionTarget: 'Imported Snapshot',
      notes: snapshot.meta.notes ?? [],
    },
    gameSystems: (snapshot.systems ?? []).map((system, index) => ({
      id: String(system.id ?? system.slug ?? `system-${index + 1}`),
      name: String(system.name ?? `System ${index + 1}`),
    })),
    locations,
    stores,
    resources,
    armor,
    weapons,
    utility,
    crafting: {
      overview: {
        requiresBlueprints: blueprints.length > 0,
        requiresFabricator: blueprints.length > 0,
        materialQualityAffectsOutput: false,
        blueprintAcquisitionMethods: [],
        notes: ['Loaded from exported public snapshot fallback.'],
        verificationStatus: 'snapshot_imported',
      },
      blueprints,
      recipes,
    },
    uiPresets: {
      featuredResourceIds: resources.slice(0, 6).map((entry) => entry.id),
      featuredArmorIds: armor.slice(0, 3).map((entry) => entry.id),
      featuredWeaponIds: weapons.slice(0, 3).map((entry) => entry.id),
      featuredStoreIds: stores.slice(0, 4).map((entry) => entry.id),
    },
  };

  return buildAppModel(normalized);
}