export type VerificationStatus = 'verified' | 'community' | 'outdated' | 'unverified';

export interface BaseEntity {
  id: string;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  verificationStatus: VerificationStatus;
  sourceNotes: string;
  imageUrl?: string;
}

export interface Resource extends BaseEntity {
  category: 'mineral' | 'gas' | 'organic' | 'salvage' | 'quantum';
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare';
  instabilityRating?: number;
  baseValue: number;
  currency: 'aUEC';
  locationIds: string[];
  miningMethodIds: string[];
  vendorIds: string[];
}

export interface Location extends BaseEntity {
  category: 'planet' | 'moon' | 'station' | 'city' | 'cave' | 'outpost' | 'lagrange';
  systemId: string;
  parentId?: string;
  resourceIds: string[];
  vendorIds: string[];
  coordinates?: string;
}

export interface MiningMethod extends BaseEntity {
  category: 'fps' | 'roc' | 'ship';
  requiredTools: string[];
  resourceIds: string[];
}

export interface Tool extends BaseEntity {
  category: 'fps' | 'vehicle' | 'ship';
  manufacturer: string;
  buyPrice?: number;
  rentPrice?: number;
  vendorIds: string[];
}

export interface Vehicle extends BaseEntity {
  category: 'ground' | 'ship';
  manufacturer: string;
  buyPrice?: number;
  rentPrice?: number;
  vendorIds: string[];
}

export interface Ingredient {
  resourceId: string;
  quantity: number;
}

export interface Recipe extends BaseEntity {
  category: string;
  ingredients: Ingredient[];
  outputItemId: string;
  outputQuantity: number;
  craftingTime: number;
  craftingStation: string;
}

export interface Blueprint extends BaseEntity {
  category: string;
  recipeId: string;
  vendorIds: string[];
  buyPrice?: number;
}

export interface Weapon extends BaseEntity {
  category: 'rifle' | 'pistol' | 'shotgun' | 'sniper' | 'smg' | 'lmg' | 'special';
  manufacturer: string;
  damage: number;
  fireRate: number;
  ammoType: string;
  attachmentSlots: number;
  buyPrice?: number;
  vendorIds: string[];
  lootSourceIds: string[];
}

export interface ArmorPiece extends BaseEntity {
  category: 'helmet' | 'torso' | 'arms' | 'legs' | 'undersuit' | 'set';
  manufacturer: string;
  armorRating: number;
  temperatureRating: string;
  buyPrice?: number;
  vendorIds: string[];
  lootSourceIds: string[];
}

export interface Vendor extends BaseEntity {
  category: 'shop' | 'mission_giver' | 'medical' | 'weapons' | 'armor' | 'equipment' | 'mining';
  locationId: string;
  inventory: string[];
}

export interface LootSource extends BaseEntity {
  category: 'npc' | 'crate' | 'chest' | 'derelict' | 'wreck';
  locationIds: string[];
  dropTable: string[];
}

export interface System extends BaseEntity {
  category: 'system';
  starType: string;
  locationIds: string[];
}

export interface Category extends BaseEntity {
  category: string;
  parentCategory?: string;
  itemCount: number;
}

export interface Manufacturer extends BaseEntity {
  category: string;
  specialization: string;
}

export interface StarCitizenData {
  resources: Resource[];
  locations: Location[];
  miningMethods: MiningMethod[];
  tools: Tool[];
  vehicles: Vehicle[];
  recipes: Recipe[];
  blueprints: Blueprint[];
  weapons: Weapon[];
  armor: ArmorPiece[];
  vendors: Vendor[];
  lootSources: LootSource[];
  systems: System[];
  categories: Category[];
  manufacturers: Manufacturer[];
}
