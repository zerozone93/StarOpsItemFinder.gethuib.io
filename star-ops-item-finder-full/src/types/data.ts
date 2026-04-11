export type VerificationStatus =
  | 'verified'
  | 'partially_verified'
  | 'general_mapping_only'
  | 'schema_placeholder'
  | 'placeholder_not_live_verified'
  | string;

export type SourceRef = {
  id: string;
  label?: string;
  url?: string;
};

export type Location = {
  id: string;
  name: string;
  systemId?: string;
  locationType?: string;
  parent?: string;
  notes?: string;
  riskLevel?: string;
};

export type MiningMethod = {
  id: string;
  name: string;
  description?: string;
  requiresToolIds?: string[];
  optionalToolIds?: string[];
  sourceRefs?: string[];
};

export type ToolOrVehicle = {
  id: string;
  name: string;
  kind?: 'tool' | 'vehicle' | string;
  manufacturer?: string;
  roles?: string[];
  attachments?: string[];
  verificationStatus?: VerificationStatus;
  sourceRefs?: string[];
};

export type Store = {
  id: string;
  name: string;
  category?: string;
  locationId?: string;
  subLocation?: string;
  products?: string[];
  verificationStatus?: VerificationStatus;
  sourceRefs?: string[];
};

export type Resource = {
  id: string;
  name: string;
  category?: string;
  miningMethods?: string[];
  requiredToolOrVehicleIds?: string[];
  knownLocations?: string[];
  locationNotes?: string;
  verificationStatus?: VerificationStatus;
  sourceRefs?: string[];
};

export type ObtainMethod = {
  type: string;
  storeIds?: string[];
  locationIds?: string[];
  confidence?: string;
};

export type Armor = {
  id: string;
  name: string;
  class?: string;
  manufacturer?: string;
  temperatureC?: { min?: number; max?: number };
  cargoProfile?: string;
  recommendedFor?: string[];
  obtainMethods?: ObtainMethod[];
  verificationStatus?: VerificationStatus;
  sourceRefs?: string[];
};

export type Weapon = {
  id: string;
  name: string;
  class?: string;
  damageType?: string;
  obtainMethods?: ObtainMethod[];
  verificationStatus?: VerificationStatus;
  sourceRefs?: string[];
};

export type Blueprint = {
  id: string;
  name: string;
  craftsCategory?: string;
  acquisitionHints?: string[];
  fabricatorType?: string;
  verificationStatus?: VerificationStatus;
  sourceRefs?: string[];
};

export type RecipeIngredient = {
  resourceId: string;
  amount: number;
  unit?: string;
};

export type Recipe = {
  id: string;
  blueprintId?: string;
  outputItemId?: string;
  ingredients?: RecipeIngredient[];
  qualityInputsMatter?: boolean;
  verificationStatus?: VerificationStatus;
  sourceRefs?: string[];
};

export type MasterData = {
  meta?: Record<string, unknown>;
  sourceCatalog: SourceRef[];
  gameSystems: { id: string; name: string }[];
  locations: Location[];
  miningMethods: MiningMethod[];
  toolsAndVehicles: ToolOrVehicle[];
  stores: Store[];
  resources: Resource[];
  armor: Armor[];
  weapons: Weapon[];
  crafting: {
    overview?: Record<string, unknown>;
    blueprints: Blueprint[];
    recipes: Recipe[];
  };
  lootAndMissionHooks?: Record<string, unknown>;
  uiPresets?: Record<string, unknown>;
};

export type SearchEntity =
  | (Resource & { entityType: 'resource' })
  | (Weapon & { entityType: 'weapon' })
  | (Armor & { entityType: 'armor' })
  | (Store & { entityType: 'store' })
  | (Location & { entityType: 'location' })
  | (Blueprint & { entityType: 'blueprint' })
  | (Recipe & { entityType: 'recipe' })
  | (ToolOrVehicle & { entityType: 'tool' })
  | (MiningMethod & { entityType: 'mining' });
