export type VerificationStatus = 'verified' | 'community' | 'outdated' | 'unverified';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchResult {
  type: string;
  id: string;
  slug: string;
  name: string;
  description: string;
  snippet: string;
  score: number;
}

export interface AssistantResponse {
  answer: string;
  sources: SearchResult[];
  confidence: number;
  intent: string;
}

export type Intent = 'greeting' | 'item_query' | 'location_query' | 'price_query' | 'unsupported';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface ImportSummary {
  resources: { created: number; updated: number };
  weapons: { created: number; updated: number };
  armor: { created: number; updated: number };
  vendors: { created: number; updated: number };
  locations: { created: number; updated: number };
  recipes: { created: number; updated: number };
}
