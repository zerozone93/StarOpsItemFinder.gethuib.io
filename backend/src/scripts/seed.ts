import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
  console.log('🌱 Seeding database...');
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@starops.local';
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'admin123', 10);
  await prisma.user.upsert({ where: { email: adminEmail }, update: {}, create: { email: adminEmail, passwordHash, role: 'admin' } });
  console.log(`✅ Admin user: ${adminEmail}`);
  const stanton = await prisma.system.upsert({ where: { slug: 'stanton' }, update: {}, create: { slug: 'stanton', name: 'Stanton', description: 'A corporate-controlled system with four planets.', verificationStatus: 'verified', tags: JSON.stringify(['stanton', 'system']), starType: 'G-type main sequence' } });
  const hurston = await prisma.location.upsert({ where: { slug: 'hurston' }, update: {}, create: { slug: 'hurston', name: 'Hurston', description: 'Industrial planet controlled by Hurston Dynamics.', category: 'planet', systemId: stanton.id, verificationStatus: 'verified', tags: JSON.stringify(['planet', 'hurston']) } });
  const daymar = await prisma.location.upsert({ where: { slug: 'daymar' }, update: {}, create: { slug: 'daymar', name: 'Daymar', description: 'Crusader moon famous for Quantanium deposits.', category: 'moon', systemId: stanton.id, verificationStatus: 'verified', tags: JSON.stringify(['moon', 'daymar']) } });
  const quantanium = await prisma.resource.upsert({ where: { slug: 'quantanium' }, update: {}, create: { slug: 'quantanium', name: 'Quantanium', description: 'Highly valuable and unstable quantum mineral.', category: 'mineral', rarity: 'rare', instabilityRating: 8.5, baseValue: 1400, currency: 'aUEC', verificationStatus: 'verified', tags: JSON.stringify(['quantanium', 'rare']) } });
  const titanium = await prisma.resource.upsert({ where: { slug: 'titanium' }, update: {}, create: { slug: 'titanium', name: 'Titanium', description: 'Common structural metal.', category: 'mineral', rarity: 'common', baseValue: 325, currency: 'aUEC', verificationStatus: 'verified', tags: JSON.stringify(['titanium', 'common']) } });
  await prisma.locationResource.upsert({ where: { locationId_resourceId: { locationId: daymar.id, resourceId: quantanium.id } }, update: {}, create: { locationId: daymar.id, resourceId: quantanium.id } });
  await prisma.locationResource.upsert({ where: { locationId_resourceId: { locationId: hurston.id, resourceId: titanium.id } }, update: {}, create: { locationId: hurston.id, resourceId: titanium.id } });
  const p4ar = await prisma.weapon.upsert({ where: { slug: 'p4-ar' }, update: {}, create: { slug: 'p4-ar', name: 'P4-AR', description: 'Reliable assault rifle by Behring.', category: 'rifle', manufacturer: 'Behring', damage: 22, fireRate: 800, ammoType: '4mm Caseless', attachmentSlots: 3, buyPrice: 850, verificationStatus: 'verified', tags: JSON.stringify(['rifle', 'behring']) } });
  const lightArmor = await prisma.armor.upsert({ where: { slug: 'rrs-light-torso' }, update: {}, create: { slug: 'rrs-light-torso', name: 'RRS Light Torso', description: 'Light torso armor.', category: 'torso', manufacturer: 'RSI', armorRating: 35, temperatureRating: 'Moderate', buyPrice: 1200, verificationStatus: 'verified', tags: JSON.stringify(['torso', 'rsi']) } });
  const centerMass = await prisma.vendor.upsert({ where: { slug: 'centermass' }, update: {}, create: { slug: 'centermass', name: 'CenterMass', description: 'Weapon shop chain.', category: 'weapons', inventory: JSON.stringify(['p4-ar']), verificationStatus: 'verified', tags: JSON.stringify(['weapons']) } });
  await prisma.vendorWeapon.upsert({ where: { vendorId_weaponId: { vendorId: centerMass.id, weaponId: p4ar.id } }, update: {}, create: { vendorId: centerMass.id, weaponId: p4ar.id } });
  await prisma.locationVendor.upsert({ where: { locationId_vendorId: { locationId: hurston.id, vendorId: centerMass.id } }, update: {}, create: { locationId: hurston.id, vendorId: centerMass.id } });
  console.log('✨ Database seeded successfully!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
