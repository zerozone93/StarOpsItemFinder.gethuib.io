import { z } from 'zod';

export const verificationStatusSchema = z.enum([
  'official_verified',
  'community_verified',
  'multi_source_match',
  'partial',
  'conflicting',
  'outdated',
  'unknown'
]);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export const idParamSchema = z.object({
  idOrSlug: z.string().min(1)
});
