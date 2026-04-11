import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';
import { slugify } from '../lib/slug.js';

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD ?? 'change-me-now';
  const passwordHash = await hashPassword(password);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, isActive: true },
    create: { email, passwordHash, isActive: true }
  });

  const system = await prisma.system.upsert({
    where: { slug: 'stanton' },
    update: {},
    create: {
      slug: 'stanton',
      name: 'Stanton',
      description: 'Seeded starter system record.',
      verificationStatus: 'partial',
      confidenceScore: 0.6
    }
  });

  const patch = await prisma.patchVersion.upsert({ where: { version: '4.0-starter' }, update: {}, create: { version: '4.0-starter' } });
  const manufacturer = await prisma.manufacturer.upsert({ where: { slug: 'rsi' }, update: {}, create: { slug: 'rsi', name: 'Roberts Space Industries' } });
  const daymar = await prisma.location.upsert({ where: { slug: 'daymar' }, update: {}, create: { slug: 'daymar', name: 'Daymar', type: 'moon', systemId: system.id, patchVersionId: patch.id, verificationStatus: 'partial', confidenceScore: 0.6 } });
  const area18 = await prisma.location.upsert({ where: { slug: 'area18' }, update: {}, create: { slug: 'area18', name: 'Area18', type: 'city', systemId: system.id, patchVersionId: patch.id, verificationStatus: 'partial', confidenceScore: 0.6 } });
  const rocMethod = await prisma.miningMethod.upsert({ where: { slug: 'roc-mining' }, update: {}, create: { slug: 'roc-mining', name: 'ROC Mining', category: 'vehicle', patchVersionId: patch.id, verificationStatus: 'partial', confidenceScore: 0.6 } });
  const roc = await prisma.vehicle.upsert({ where: { slug: 'greycat-roc' }, update: {}, create: { slug: 'greycat-roc', name: 'Greycat ROC', category: 'mining vehicle', manufacturerId: manufacturer.id, patchVersionId: patch.id, verificationStatus: 'partial', confidenceScore: 0.6 } });
  const hadanite = await prisma.resource.upsert({ where: { slug: 'hadanite' }, update: {}, create: { slug: 'hadanite', name: 'Hadanite', category: 'gemstone', patchVersionId: patch.id, verificationStatus: 'partial', confidenceScore: 0.6 } });
  const centerMass = await prisma.vendor.upsert({ where: { slug: 'centermass-area18' }, update: {}, create: { slug: 'centermass-area18', name: 'CenterMass', patchVersionId: patch.id, verificationStatus: 'partial', confidenceScore: 0.6 } });
  const weapon = await prisma.weapon.upsert({ where: { slug: 'p4-ar' }, update: {}, create: { slug: 'p4-ar', name: 'P4-AR', category: 'rifle', manufacturerId: manufacturer.id, patchVersionId: patch.id, verificationStatus: 'partial', confidenceScore: 0.55 } });

  await prisma.resourceLocation.upsert({ where: { resourceId_locationId: { resourceId: hadanite.id, locationId: daymar.id } }, update: {}, create: { resourceId: hadanite.id, locationId: daymar.id } });
  await prisma.resourceMiningMethod.upsert({ where: { resourceId_miningMethodId: { resourceId: hadanite.id, miningMethodId: rocMethod.id } }, update: {}, create: { resourceId: hadanite.id, miningMethodId: rocMethod.id } });
  await prisma.resourceVehicle.upsert({ where: { resourceId_vehicleId: { resourceId: hadanite.id, vehicleId: roc.id } }, update: {}, create: { resourceId: hadanite.id, vehicleId: roc.id } });
  await prisma.vendorLocation.upsert({ where: { vendorId_locationId: { vendorId: centerMass.id, locationId: area18.id } }, update: {}, create: { vendorId: centerMass.id, locationId: area18.id } });
  await prisma.vendorWeapon.upsert({ where: { vendorId_weaponId: { vendorId: centerMass.id, weaponId: weapon.id } }, update: {}, create: { vendorId: centerMass.id, weaponId: weapon.id } });

  const source = await prisma.sourceReference.upsert({
    where: { id: slugify('seed-data-reference') },
    update: {},
    create: { id: slugify('seed-data-reference'), label: 'Seed Data Reference', notes: 'Starter development data.' }
  }).catch(async () => prisma.sourceReference.create({ label: 'Seed Data Reference', notes: 'Starter development data.' }));

  await prisma.resourceSourceReference.upsert({ where: { resourceId_sourceReferenceId: { resourceId: hadanite.id, sourceReferenceId: source.id } }, update: {}, create: { resourceId: hadanite.id, sourceReferenceId: source.id } });

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
