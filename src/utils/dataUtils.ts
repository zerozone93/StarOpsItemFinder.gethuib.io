import type { StarCitizenData, BaseEntity } from '../types';

export function getById<T extends BaseEntity>(items: T[], id: string): T | undefined {
  return items.find((i) => i.id === id);
}

export function getBySlug<T extends BaseEntity>(items: T[], slug: string): T | undefined {
  return items.find((i) => i.slug === slug);
}

export function getLocationName(data: StarCitizenData, id: string): string {
  return data.locations.find((l) => l.id === id)?.name ?? id;
}

export function getVendorName(data: StarCitizenData, id: string): string {
  return data.vendors.find((v) => v.id === id)?.name ?? id;
}

export function getResourceName(data: StarCitizenData, id: string): string {
  return data.resources.find((r) => r.id === id)?.name ?? id;
}

export function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function searchAll<T extends BaseEntity>(items: T[], query: string): T[] {
  const q = query.toLowerCase().trim();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q)) ||
      fuzzyMatch(item.name, q)
  );
}
