import { z } from 'zod';

export const WeaponCreateSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().default(''),
  verificationStatus: z.enum(['verified', 'community', 'outdated', 'unverified']).default('unverified'),
  sourceNotes: z.string().default(''),
  patchVersion: z.string().default(''),
  tags: z.array(z.string()).default([]),
  category: z.enum(['rifle', 'pistol', 'shotgun', 'sniper', 'smg', 'lmg', 'special']).default('rifle'),
  manufacturer: z.string().default(''),
  damage: z.number().default(0),
  fireRate: z.number().default(0),
  ammoType: z.string().default(''),
  attachmentSlots: z.number().int().default(0),
  buyPrice: z.number().optional(),
});

export const WeaponUpdateSchema = WeaponCreateSchema.partial();
export type WeaponCreate = z.infer<typeof WeaponCreateSchema>;
export type WeaponUpdate = z.infer<typeof WeaponUpdateSchema>;
