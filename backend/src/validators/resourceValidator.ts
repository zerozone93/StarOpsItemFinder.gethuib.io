import { z } from 'zod';

export const ResourceCreateSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().default(''),
  verificationStatus: z.enum(['verified', 'community', 'outdated', 'unverified']).default('unverified'),
  sourceNotes: z.string().default(''),
  patchVersion: z.string().default(''),
  tags: z.array(z.string()).default([]),
  category: z.enum(['mineral', 'gas', 'organic', 'salvage', 'quantum']).default('mineral'),
  rarity: z.enum(['common', 'uncommon', 'rare', 'very_rare']).default('common'),
  instabilityRating: z.number().optional(),
  baseValue: z.number().default(0),
  currency: z.string().default('aUEC'),
});

export const ResourceUpdateSchema = ResourceCreateSchema.partial();
export type ResourceCreate = z.infer<typeof ResourceCreateSchema>;
export type ResourceUpdate = z.infer<typeof ResourceUpdateSchema>;
