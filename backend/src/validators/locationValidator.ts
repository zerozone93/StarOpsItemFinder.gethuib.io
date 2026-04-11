import { z } from 'zod';

export const LocationCreateSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().default(''),
  verificationStatus: z.enum(['verified', 'community', 'outdated', 'unverified']).default('unverified'),
  sourceNotes: z.string().default(''),
  patchVersion: z.string().default(''),
  tags: z.array(z.string()).default([]),
  category: z.enum(['planet', 'moon', 'station', 'city', 'cave', 'outpost', 'lagrange']).default('outpost'),
  systemId: z.string().optional(),
  parentId: z.string().optional(),
  coordinates: z.string().optional(),
});

export const LocationUpdateSchema = LocationCreateSchema.partial();
export type LocationCreate = z.infer<typeof LocationCreateSchema>;
export type LocationUpdate = z.infer<typeof LocationUpdateSchema>;
