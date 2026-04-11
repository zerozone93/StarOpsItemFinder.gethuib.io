export const entityNames = [
  'systems',
  'locations',
  'resources',
  'miningMethods',
  'tools',
  'vehicles',
  'vendors',
  'lootSources',
  'weapons',
  'armor',
  'blueprints',
  'recipes'
] as const;

export type EntityName = (typeof entityNames)[number];

export type VerificationStatus =
  | 'official_verified'
  | 'community_verified'
  | 'multi_source_match'
  | 'partial'
  | 'conflicting'
  | 'outdated'
  | 'unknown';

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AssistantAnswer {
  answer: string;
  confidence: number;
  matchedEntities: Array<{ type: string; id: string; slug: string; name: string }>;
  relatedEntities: Array<{ type: string; id: string; slug: string; name: string }>;
  verificationWarnings: string[];
  sources: Array<{ label: string; url?: string | null }>;
}
