import { z } from 'zod';

export const ArmorCreateSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().default(''),
  verificationStatus: z.enum(['verified', 'community', 'outdated', 'unverified']).default('unverified'),
  sourceNotes: z.string().default(''),
  patchVersion: z.string().default(''),
  tags: z.array(z.string()).default([]),
  category: z.enum(['helmet', 'torso', 'arms', 'legs', 'undersuit', 'set']).default('torso'),
  manufacturer: z.string().default(''),
  armorRating: z.number().default(0),
  temperatureRating: z.string().default(''),
  buyPrice: z.number().optional(),
});

export const ArmorUpdateSchema = ArmorCreateSchema.partial();
export type ArmorCreate = z.infer<typeof ArmorCreateSchema>;
export type ArmorUpdate = z.infer<typeof ArmorUpdateSchema>;
