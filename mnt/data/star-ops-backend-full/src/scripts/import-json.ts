import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../lib/prisma.js';
import { slugify } from '../lib/slug.js';

interface MasterData {
  systems?: Array<{ name: string; slug?: string; description?: string }>;
  locations?: Array<{ name: string; slug?: string; description?: string; type?: string; parentSlug?: string; systemSlug?: string; riskLevel?: string; verificationStatus?: any; confidenceScore?: number }>;
  miningMethods?: Array<{ name: string; slug?: string; description?: string; category?: string; requirements?: string }>;
  tools?: Array<{ name: string; slug?: string; description?: string; category?: string; manufacturer?: string }>;
  vehicles?: Array<{ name: string; slug?: string; description?: string; category?: string; manufacturer?: string }>;
  resources?: Array<{ name: string; slug?: string; description?: string; category?: string; miningTier?: string; processingNotes?: string; locationSlugs?: string[]; miningMethodSlugs?: string[]; toolSlugs?: string[]; vehicleSlugs?: string[]; verificationStatus?: any; confidenceScore?: number }>;
  vendors?: Array<{ name: string; slug?: string; description?: string; locationSlugs?: string[]; verificationStatus?: any; confidenceScore?: number }>;
  lootSources?: Array<{ name: string; slug?: string; description?: string; obtainMethod?: any; locationSlugs?: string[]; verificationStatus?: any; confidenceScore?: number }>;
  weapons?: Array<{ name: string; slug?: string; description?: string; category?: string; obtainMethod?: any; manufacturer?: string; vendorSlugs?: string[]; lootSourceSlugs?: string[]; verificationStatus?: any; confidenceScore?: number }>;
  armor?: Array<{ name: string; slug?: string; description?: string; category?: string; slot?: any; obtainMethod?: any; manufacturer?: string; vendorSlugs?: string[]; lootSourceSlugs?: string[]; verificationStatus?: any; confidenceScore?: number }>;
  blueprints?: Array<{ name: string; slug?: string; description?: string; qualityNotes?: string; verificationStatus?: any; confidenceScore?: number }>;
  recipes?: Array<{ name: string; slug?: string; description?: string; fabricator?: string; blueprintSlug?: string; ingredients?: Array<{ resourceSlug: string; quantity: number; notes?: string }>; outputWeaponSlug?: string; outputArmorSlug?: string; verificationStatus?: any; confidenceScore?: number }>;
}

const inputPath = process.argv[2] ?? path.resolve(process.cwd(), '../star-ops-master-data.json');

async function main() {
  const raw = await fs.readFile(inputPath, 'utf8');
  const data = JSON.parse(raw) as MasterData;

  const manufacturerMap = new Map<string, string>();
  const getManufacturerId = async (name?: string) => {
    if (!name) return null;
    const key = slugify(name);
    if (manufacturerMap.has(key)) return manufacturerMap.get(key)!;
    const record = await prisma.manufacturer.upsert({ where: { slug: key }, update: { name }, create: { slug: key, name } });
    manufacturerMap.set(key, record.id);
    return record.id;
  };

  for (const system of data.systems ?? []) {
    await prisma.system.upsert({ where: { slug: system.slug ?? slugify(system.name) }, update: { name: system.name, description: system.description }, create: { slug: system.slug ?? slugify(system.name), name: system.name, description: system.description } });
  }

  for (const location of data.locations ?? []) {
    const system = location.systemSlug ? await prisma.system.findUnique({ where: { slug: location.systemSlug } }) : null;
    const parent = location.parentSlug ? await prisma.location.findUnique({ where: { slug: location.parentSlug } }) : null;
    await prisma.location.upsert({
      where: { slug: location.slug ?? slugify(location.name) },
      update: { name: location.name, description: location.description, type: (location.type as any) ?? 'other', riskLevel: location.riskLevel, systemId: system?.id ?? null, parentLocationId: parent?.id ?? null, verificationStatus: location.verificationStatus ?? 'unknown', confidenceScore: location.confidenceScore ?? 0.5 },
      create: { slug: location.slug ?? slugify(location.name), name: location.name, description: location.description, type: (location.type as any) ?? 'other', riskLevel: location.riskLevel, systemId: system?.id ?? null, parentLocationId: parent?.id ?? null, verificationStatus: location.verificationStatus ?? 'unknown', confidenceScore: location.confidenceScore ?? 0.5 }
    });
  }

  for (const method of data.miningMethods ?? []) {
    await prisma.miningMethod.upsert({ where: { slug: method.slug ?? slugify(method.name) }, update: { name: method.name, description: method.description, category: method.category, requirements: method.requirements }, create: { slug: method.slug ?? slugify(method.name), name: method.name, description: method.description, category: method.category, requirements: method.requirements } });
  }

  for (const tool of data.tools ?? []) {
    await prisma.tool.upsert({ where: { slug: tool.slug ?? slugify(tool.name) }, update: { name: tool.name, description: tool.description, category: tool.category, manufacturerId: await getManufacturerId(tool.manufacturer) }, create: { slug: tool.slug ?? slugify(tool.name), name: tool.name, description: tool.description, category: tool.category, manufacturerId: await getManufacturerId(tool.manufacturer) } });
  }

  for (const vehicle of data.vehicles ?? []) {
    await prisma.vehicle.upsert({ where: { slug: vehicle.slug ?? slugify(vehicle.name) }, update: { name: vehicle.name, description: vehicle.description, category: vehicle.category, manufacturerId: await getManufacturerId(vehicle.manufacturer) }, create: { slug: vehicle.slug ?? slugify(vehicle.name), name: vehicle.name, description: vehicle.description, category: vehicle.category, manufacturerId: await getManufacturerId(vehicle.manufacturer) } });
  }

  for (const resource of data.resources ?? []) {
    const record = await prisma.resource.upsert({ where: { slug: resource.slug ?? slugify(resource.name) }, update: { name: resource.name, description: resource.description, category: resource.category, miningTier: resource.miningTier, processingNotes: resource.processingNotes, verificationStatus: resource.verificationStatus ?? 'unknown', confidenceScore: resource.confidenceScore ?? 0.5 }, create: { slug: resource.slug ?? slugify(resource.name), name: resource.name, description: resource.description, category: resource.category, miningTier: resource.miningTier, processingNotes: resource.processingNotes, verificationStatus: resource.verificationStatus ?? 'unknown', confidenceScore: resource.confidenceScore ?? 0.5 } });
    await prisma.resourceLocation.deleteMany({ where: { resourceId: record.id } });
    await prisma.resourceMiningMethod.deleteMany({ where: { resourceId: record.id } });
    await prisma.resourceTool.deleteMany({ where: { resourceId: record.id } });
    await prisma.resourceVehicle.deleteMany({ where: { resourceId: record.id } });
    for (const slug of resource.locationSlugs ?? []) {
      const location = await prisma.location.findUnique({ where: { slug } });
      if (location) await prisma.resourceLocation.create({ data: { resourceId: record.id, locationId: location.id } }).catch(() => undefined);
    }
    for (const slug of resource.miningMethodSlugs ?? []) {
      const method = await prisma.miningMethod.findUnique({ where: { slug } });
      if (method) await prisma.resourceMiningMethod.create({ data: { resourceId: record.id, miningMethodId: method.id } }).catch(() => undefined);
    }
    for (const slug of resource.toolSlugs ?? []) {
      const tool = await prisma.tool.findUnique({ where: { slug } });
      if (tool) await prisma.resourceTool.create({ data: { resourceId: record.id, toolId: tool.id } }).catch(() => undefined);
    }
    for (const slug of resource.vehicleSlugs ?? []) {
      const vehicle = await prisma.vehicle.findUnique({ where: { slug } });
      if (vehicle) await prisma.resourceVehicle.create({ data: { resourceId: record.id, vehicleId: vehicle.id } }).catch(() => undefined);
    }
  }

  for (const vendor of data.vendors ?? []) {
    const record = await prisma.vendor.upsert({ where: { slug: vendor.slug ?? slugify(vendor.name) }, update: { name: vendor.name, description: vendor.description, verificationStatus: vendor.verificationStatus ?? 'unknown', confidenceScore: vendor.confidenceScore ?? 0.5 }, create: { slug: vendor.slug ?? slugify(vendor.name), name: vendor.name, description: vendor.description, verificationStatus: vendor.verificationStatus ?? 'unknown', confidenceScore: vendor.confidenceScore ?? 0.5 } });
    await prisma.vendorLocation.deleteMany({ where: { vendorId: record.id } });
    for (const slug of vendor.locationSlugs ?? []) {
      const location = await prisma.location.findUnique({ where: { slug } });
      if (location) await prisma.vendorLocation.create({ data: { vendorId: record.id, locationId: location.id } }).catch(() => undefined);
    }
  }

  for (const loot of data.lootSources ?? []) {
    const record = await prisma.lootSource.upsert({ where: { slug: loot.slug ?? slugify(loot.name) }, update: { name: loot.name, description: loot.description, obtainMethod: loot.obtainMethod ?? 'unknown', verificationStatus: loot.verificationStatus ?? 'unknown', confidenceScore: loot.confidenceScore ?? 0.5 }, create: { slug: loot.slug ?? slugify(loot.name), name: loot.name, description: loot.description, obtainMethod: loot.obtainMethod ?? 'unknown', verificationStatus: loot.verificationStatus ?? 'unknown', confidenceScore: loot.confidenceScore ?? 0.5 } });
    await prisma.lootSourceLocation.deleteMany({ where: { lootSourceId: record.id } });
    for (const slug of loot.locationSlugs ?? []) {
      const location = await prisma.location.findUnique({ where: { slug } });
      if (location) await prisma.lootSourceLocation.create({ data: { lootSourceId: record.id, locationId: location.id } }).catch(() => undefined);
    }
  }

  for (const weapon of data.weapons ?? []) {
    const record = await prisma.weapon.upsert({ where: { slug: weapon.slug ?? slugify(weapon.name) }, update: { name: weapon.name, description: weapon.description, category: weapon.category, obtainMethod: weapon.obtainMethod ?? 'unknown', manufacturerId: await getManufacturerId(weapon.manufacturer), verificationStatus: weapon.verificationStatus ?? 'unknown', confidenceScore: weapon.confidenceScore ?? 0.5 }, create: { slug: weapon.slug ?? slugify(weapon.name), name: weapon.name, description: weapon.description, category: weapon.category, obtainMethod: weapon.obtainMethod ?? 'unknown', manufacturerId: await getManufacturerId(weapon.manufacturer), verificationStatus: weapon.verificationStatus ?? 'unknown', confidenceScore: weapon.confidenceScore ?? 0.5 } });
    await prisma.vendorWeapon.deleteMany({ where: { weaponId: record.id } });
    await prisma.weaponLootSource.deleteMany({ where: { weaponId: record.id } });
    for (const slug of weapon.vendorSlugs ?? []) {
      const vendor = await prisma.vendor.findUnique({ where: { slug } });
      if (vendor) await prisma.vendorWeapon.create({ data: { weaponId: record.id, vendorId: vendor.id } }).catch(() => undefined);
    }
    for (const slug of weapon.lootSourceSlugs ?? []) {
      const loot = await prisma.lootSource.findUnique({ where: { slug } });
      if (loot) await prisma.weaponLootSource.create({ data: { weaponId: record.id, lootSourceId: loot.id } }).catch(() => undefined);
    }
  }

  for (const armor of data.armor ?? []) {
    const record = await prisma.armor.upsert({ where: { slug: armor.slug ?? slugify(armor.name) }, update: { name: armor.name, description: armor.description, category: armor.category, slot: armor.slot ?? 'other', obtainMethod: armor.obtainMethod ?? 'unknown', manufacturerId: await getManufacturerId(armor.manufacturer), verificationStatus: armor.verificationStatus ?? 'unknown', confidenceScore: armor.confidenceScore ?? 0.5 }, create: { slug: armor.slug ?? slugify(armor.name), name: armor.name, description: armor.description, category: armor.category, slot: armor.slot ?? 'other', obtainMethod: armor.obtainMethod ?? 'unknown', manufacturerId: await getManufacturerId(armor.manufacturer), verificationStatus: armor.verificationStatus ?? 'unknown', confidenceScore: armor.confidenceScore ?? 0.5 } });
    await prisma.vendorArmor.deleteMany({ where: { armorId: record.id } });
    await prisma.armorLootSource.deleteMany({ where: { armorId: record.id } });
    for (const slug of armor.vendorSlugs ?? []) {
      const vendor = await prisma.vendor.findUnique({ where: { slug } });
      if (vendor) await prisma.vendorArmor.create({ data: { armorId: record.id, vendorId: vendor.id } }).catch(() => undefined);
    }
    for (const slug of armor.lootSourceSlugs ?? []) {
      const loot = await prisma.lootSource.findUnique({ where: { slug } });
      if (loot) await prisma.armorLootSource.create({ data: { armorId: record.id, lootSourceId: loot.id } }).catch(() => undefined);
    }
  }

  for (const blueprint of data.blueprints ?? []) {
    await prisma.blueprint.upsert({ where: { slug: blueprint.slug ?? slugify(blueprint.name) }, update: { name: blueprint.name, description: blueprint.description, qualityNotes: blueprint.qualityNotes, verificationStatus: blueprint.verificationStatus ?? 'unknown', confidenceScore: blueprint.confidenceScore ?? 0.5 }, create: { slug: blueprint.slug ?? slugify(blueprint.name), name: blueprint.name, description: blueprint.description, qualityNotes: blueprint.qualityNotes, verificationStatus: blueprint.verificationStatus ?? 'unknown', confidenceScore: blueprint.confidenceScore ?? 0.5 } });
  }

  for (const recipe of data.recipes ?? []) {
    const blueprint = recipe.blueprintSlug ? await prisma.blueprint.findUnique({ where: { slug: recipe.blueprintSlug } }) : null;
    const record = await prisma.recipe.upsert({ where: { slug: recipe.slug ?? slugify(recipe.name) }, update: { name: recipe.name, description: recipe.description, fabricator: recipe.fabricator, blueprintId: blueprint?.id ?? null, verificationStatus: recipe.verificationStatus ?? 'unknown', confidenceScore: recipe.confidenceScore ?? 0.5 }, create: { slug: recipe.slug ?? slugify(recipe.name), name: recipe.name, description: recipe.description, fabricator: recipe.fabricator, blueprintId: blueprint?.id ?? null, verificationStatus: recipe.verificationStatus ?? 'unknown', confidenceScore: recipe.confidenceScore ?? 0.5 } });
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: record.id } });
    for (const ingredient of recipe.ingredients ?? []) {
      const resource = await prisma.resource.findUnique({ where: { slug: ingredient.resourceSlug } });
      if (resource) await prisma.recipeIngredient.create({ data: { recipeId: record.id, resourceId: resource.id, quantity: ingredient.quantity, notes: ingredient.notes } });
    }
    if (recipe.outputWeaponSlug) {
      const weapon = await prisma.weapon.findUnique({ where: { slug: recipe.outputWeaponSlug } });
      if (weapon) await prisma.weapon.update({ where: { id: weapon.id }, data: { recipeId: record.id } });
    }
    if (recipe.outputArmorSlug) {
      const armor = await prisma.armor.findUnique({ where: { slug: recipe.outputArmorSlug } });
      if (armor) await prisma.armor.update({ where: { id: armor.id }, data: { recipeId: record.id } });
    }
  }

  console.log(`Import complete from ${inputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
