import { z } from 'zod';
import { verificationStatusSchema } from './common.js';

const sharedEntitySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  sourceNotes: z.string().optional().nullable(),
  confidenceScore: z.coerce.number().min(0).max(1).optional().default(0.5),
  verificationStatus: verificationStatusSchema.optional().default('unknown'),
  patchVersion: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([])
});

export const resourceInputSchema = sharedEntitySchema.extend({
  miningTier: z.string().optional().nullable(),
  processingNotes: z.string().optional().nullable(),
  locationIds: z.array(z.string()).optional().default([]),
  miningMethodIds: z.array(z.string()).optional().default([]),
  toolIds: z.array(z.string()).optional().default([]),
  vehicleIds: z.array(z.string()).optional().default([])
});

export const weaponInputSchema = sharedEntitySchema.extend({
  obtainMethod: z.enum(['buy', 'loot', 'craft', 'mission', 'reputation', 'mixed', 'unknown']).optional().default('unknown'),
  manufacturerId: z.string().optional().nullable(),
  vendorIds: z.array(z.string()).optional().default([]),
  lootSourceIds: z.array(z.string()).optional().default([])
});

export const armorInputSchema = sharedEntitySchema.extend({
  slot: z.enum(['head', 'torso', 'arms', 'legs', 'undersuit', 'backpack', 'full_set', 'utility', 'other']).optional().default('other'),
  obtainMethod: z.enum(['buy', 'loot', 'craft', 'mission', 'reputation', 'mixed', 'unknown']).optional().default('unknown'),
  manufacturerId: z.string().optional().nullable(),
  vendorIds: z.array(z.string()).optional().default([]),
  lootSourceIds: z.array(z.string()).optional().default([])
});

export const vendorInputSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  sourceNotes: z.string().optional().nullable(),
  confidenceScore: z.coerce.number().min(0).max(1).optional().default(0.5),
  verificationStatus: verificationStatusSchema.optional().default('unknown'),
  locationIds: z.array(z.string()).optional().default([])
});
