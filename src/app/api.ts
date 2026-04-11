import type { ConsoleEntity, ExportedAppSnapshot, MasterDataset } from './data';

export type AssistantResponse = {
  query: string;
  response: string;
  matches: Array<Pick<ConsoleEntity, 'id' | 'name' | 'type' | 'category' | 'verificationStatus' | 'summary'>>;
};

export type AdminUser = {
  id: string;
  username: string;
  createdAt?: string;
};

export type ManagedAdminUser = {
  id: string;
  username: string;
  createdAt: string;
};

export type AuthResponse = {
  token: string;
  user: AdminUser;
  expiresAt: string;
};

export type AdminState = {
  uiOverrides: {
    featuredResourceIds: string[] | null;
    featuredArmorIds: string[] | null;
    featuredWeaponIds: string[] | null;
    featuredStoreIds: string[] | null;
    announcement: string;
    verificationNotes: string[];
  };
  auditLog: Array<{
    id: string;
    actor: string;
    action: string;
    createdAt: string;
    details?: Record<string, unknown>;
  }>;
  defaultAdminUsername: string;
  storage: {
    storagePath: string;
    datasetPath: string;
    storageExists: boolean;
    datasetVersion: string;
    sessions: number;
    adminUsers: number;
    auditEntries: number;
    lastAuditAt: string | null;
  };
};

export type StorageExport = {
  exportedAt: string;
  storage: {
    version: number;
    adminUsers: Array<{ id: string; username: string; createdAt: string }>;
    sessions: Array<{ userId: string; expiresAt: string }>;
    uiOverrides: AdminState['uiOverrides'];
    auditLog: AdminState['auditLog'];
  };
  summary: AdminState['storage'];
};

export type PaginatedResponse<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  results: T[];
};

function withAuth(token?: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchDataset() {
  return apiRequest<MasterDataset>('/api/dataset');
}

export function fetchPublicSnapshot() {
  return apiRequest<ExportedAppSnapshot>('/star-citizen-data.json');
}

export function askAssistant(query: string) {
  return apiRequest<AssistantResponse>('/api/assistant/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

export function loginAdmin(username: string, password: string) {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function fetchAdminMe(token: string) {
  return apiRequest<{ user: AdminUser }>('/api/auth/me', {
    headers: withAuth(token),
  });
}

export function logoutAdmin(token: string) {
  return apiRequest<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
    headers: withAuth(token),
  });
}

export function fetchAdminState(token: string) {
  return apiRequest<AdminState>('/api/admin/state', {
    headers: withAuth(token),
  });
}

export function fetchAdminUsers(token: string) {
  return apiRequest<{ users: ManagedAdminUser[] }>('/api/admin/users', {
    headers: withAuth(token),
  });
}

export function createAdminUser(token: string, payload: { username: string; password: string }) {
  return apiRequest<{ ok: true; user: ManagedAdminUser }>('/api/admin/users', {
    method: 'POST',
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export function updateAdminPassword(token: string, userId: string, payload: { password: string }) {
  return apiRequest<{ ok: true }>('/api/admin/users/' + encodeURIComponent(userId) + '/password', {
    method: 'PUT',
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export function exportAdminStorage(token: string) {
  return apiRequest<StorageExport>('/api/admin/storage/export', {
    headers: withAuth(token),
  });
}

export function updateAdminState(
  token: string,
  payload: {
    featuredResourceIds: string[];
    featuredArmorIds: string[];
    featuredWeaponIds: string[];
    featuredStoreIds: string[];
    announcement: string;
    verificationNotes: string[];
  },
) {
  return apiRequest<{ ok: true; uiOverrides: AdminState['uiOverrides'] }>('/api/admin/state', {
    method: 'PUT',
    headers: withAuth(token),
    body: JSON.stringify(payload),
  });
}

export function fetchCollection<T>(collection: string, params: Record<string, string | number>) {
  const query = new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((accumulator, [key, value]) => {
      accumulator[key] = String(value);
      return accumulator;
    }, {}),
  );

  return apiRequest<PaginatedResponse<T>>(`/api/${collection}?${query.toString()}`);
}