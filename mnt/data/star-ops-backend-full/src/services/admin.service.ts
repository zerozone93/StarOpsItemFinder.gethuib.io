import { prisma } from '../lib/prisma.js';
import type { z } from 'zod';
import { armorInputSchema, resourceInputSchema, vendorInputSchema, weaponInputSchema } from '../validators/entities.js';

type ResourceInput = z.infer<typeof resourceInputSchema>;
type WeaponInput = z.infer<typeof weaponInputSchema>;
type ArmorInput = z.infer<typeof armorInputSchema>;
type VendorInput = z.infer<typeof vendorInputSchema>;

async function ensurePatchVersion(version?: string | null) {
  if (!version) return null;
  return prisma.patchVersion.upsert({
    where: { version },
    update: {},
    create: { version }
  });
}

export async function upsertResource(input: ResourceInput) {
  const patchVersion = await ensurePatchVersion(input.patchVersion);
  const resource = await prisma.resource.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      description: input.description,
      category: input.category,
      miningTier: input.miningTier,
      processingNotes: input.processingNotes,
      confidenceScore: input.confidenceScore,
      verificationStatus: input.verificationStatus,
      sourceNotes: input.sourceNotes,
      patchVersionId: patchVersion?.id ?? null
    },
    create: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      category: input.category,
      miningTier: input.miningTier,
      processingNotes: input.processingNotes,
      confidenceScore: input.confidenceScore,
      verificationStatus: input.verificationStatus,
      sourceNotes: input.sourceNotes,
      patchVersionId: patchVersion?.id ?? null
    }
  });

  await prisma.resourceLocation.deleteMany({ where: { resourceId: resource.id } });
  await prisma.resourceMiningMethod.deleteMany({ where: { resourceId: resource.id } });
  await prisma.resourceTool.deleteMany({ where: { resourceId: resource.id } });
  await prisma.resourceVehicle.deleteMany({ where: { resourceId: resource.id } });

  if (input.locationIds.length) {
    await prisma.resourceLocation.createMany({ data: input.locationIds.map((locationId) => ({ resourceId: resource.id, locationId })) });
  }
  if (input.miningMethodIds.length) {
    await prisma.resourceMiningMethod.createMany({ data: input.miningMethodIds.map((miningMethodId) => ({ resourceId: resource.id, miningMethodId })) });
  }
  if (input.toolIds.length) {
    await prisma.resourceTool.createMany({ data: input.toolIds.map((toolId) => ({ resourceId: resource.id, toolId })) });
  }
  if (input.vehicleIds.length) {
    await prisma.resourceVehicle.createMany({ data: input.vehicleIds.map((vehicleId) => ({ resourceId: resource.id, vehicleId })) });
  }

  return resource;
}

export async function upsertWeapon(input: WeaponInput) {
  const patchVersion = await ensurePatchVersion(input.patchVersion);
  const weapon = await prisma.weapon.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      description: input.description,
      category: input.category,
      obtainMethod: input.obtainMethod,
      manufacturerId: input.manufacturerId,
      confidenceScore: input.confidenceScore,
      verificationStatus: input.verificationStatus,
      sourceNotes: input.sourceNotes,
      patchVersionId: patchVersion?.id ?? null
    },
    create: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      category: input.category,
      obtainMethod: input.obtainMethod,
      manufacturerId: input.manufacturerId,
      confidenceScore: input.confidenceScore,
      verificationStatus: input.verificationStatus,
      sourceNotes: input.sourceNotes,
      patchVersionId: patchVersion?.id ?? null
    }
  });

  await prisma.vendorWeapon.deleteMany({ where: { weaponId: weapon.id } });
  await prisma.weaponLootSource.deleteMany({ where: { weaponId: weapon.id } });

  if (input.vendorIds.length) await prisma.vendorWeapon.createMany({ data: input.vendorIds.map((vendorId) => ({ weaponId: weapon.id, vendorId })) });
  if (input.lootSourceIds.length) await prisma.weaponLootSource.createMany({ data: input.lootSourceIds.map((lootSourceId) => ({ weaponId: weapon.id, lootSourceId })) });

  return weapon;
}

export async function upsertArmor(input: ArmorInput) {
  const patchVersion = await ensurePatchVersion(input.patchVersion);
  const armor = await prisma.armor.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      description: input.description,
      category: input.category,
      slot: input.slot,
      obtainMethod: input.obtainMethod,
      manufacturerId: input.manufacturerId,
      confidenceScore: input.confidenceScore,
      verificationStatus: input.verificationStatus,
      sourceNotes: input.sourceNotes,
      patchVersionId: patchVersion?.id ?? null
    },
    create: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      category: input.category,
      slot: input.slot,
      obtainMethod: input.obtainMethod,
      manufacturerId: input.manufacturerId,
      confidenceScore: input.confidenceScore,
      verificationStatus: input.verificationStatus,
      sourceNotes: input.sourceNotes,
      patchVersionId: patchVersion?.id ?? null
    }
  });

  await prisma.vendorArmor.deleteMany({ where: { armorId: armor.id } });
  await prisma.armorLootSource.deleteMany({ where: { armorId: armor.id } });
  if (input.vendorIds.length) await prisma.vendorArmor.createMany({ data: input.vendorIds.map((vendorId) => ({ armorId: armor.id, vendorId })) });
  if (input.lootSourceIds.length) await prisma.armorLootSource.createMany({ data: input.lootSourceIds.map((lootSourceId) => ({ armorId: armor.id, lootSourceId })) });
  return armor;
}

export async function upsertVendor(input: VendorInput) {
  const vendor = await prisma.vendor.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      description: input.description,
      confidenceScore: input.confidenceScore,
      verificationStatus: input.verificationStatus,
      sourceNotes: input.sourceNotes
    },
    create: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      confidenceScore: input.confidenceScore,
      verificationStatus: input.verificationStatus,
      sourceNotes: input.sourceNotes
    }
  });

  await prisma.vendorLocation.deleteMany({ where: { vendorId: vendor.id } });
  if (input.locationIds.length) await prisma.vendorLocation.createMany({ data: input.locationIds.map((locationId) => ({ vendorId: vendor.id, locationId })) });
  return vendor;
}
