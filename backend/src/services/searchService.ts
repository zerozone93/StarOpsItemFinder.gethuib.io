import prisma from '../db/prisma.js';
import { SearchResult, PaginatedResponse } from '../types/index.js';

function makeSnippet(text: string, query: string, maxLen = 120): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen);
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + 90);
  return (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
}

function scoreResult(name: string, description: string, query: string): number {
  const lq = query.toLowerCase();
  const ln = name.toLowerCase();
  const ld = description.toLowerCase();
  let score = 0;
  if (ln === lq) score += 100;
  else if (ln.startsWith(lq)) score += 80;
  else if (ln.includes(lq)) score += 60;
  if (ld.includes(lq)) score += 20;
  return score;
}

export async function globalSearch(
  query: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<SearchResult>> {
  const skip = (page - 1) * limit;
  const results: SearchResult[] = [];

  const [resources, weapons, armor, vendors, locations] = await Promise.all([
    prisma.resource.findMany({ where: { OR: [{ name: { contains: query } }, { description: { contains: query } }, { tags: { contains: query } }] } }),
    prisma.weapon.findMany({ where: { OR: [{ name: { contains: query } }, { description: { contains: query } }] } }),
    prisma.armor.findMany({ where: { OR: [{ name: { contains: query } }, { description: { contains: query } }] } }),
    prisma.vendor.findMany({ where: { OR: [{ name: { contains: query } }, { description: { contains: query } }] } }),
    prisma.location.findMany({ where: { OR: [{ name: { contains: query } }, { description: { contains: query } }] } }),
  ]);

  for (const r of resources) {
    results.push({ type: 'resource', id: r.id, slug: r.slug, name: r.name, description: r.description, snippet: makeSnippet(r.description, query), score: scoreResult(r.name, r.description, query) });
  }
  for (const w of weapons) {
    results.push({ type: 'weapon', id: w.id, slug: w.slug, name: w.name, description: w.description, snippet: makeSnippet(w.description, query), score: scoreResult(w.name, w.description, query) });
  }
  for (const a of armor) {
    results.push({ type: 'armor', id: a.id, slug: a.slug, name: a.name, description: a.description, snippet: makeSnippet(a.description, query), score: scoreResult(a.name, a.description, query) });
  }
  for (const v of vendors) {
    results.push({ type: 'vendor', id: v.id, slug: v.slug, name: v.name, description: v.description, snippet: makeSnippet(v.description, query), score: scoreResult(v.name, v.description, query) });
  }
  for (const l of locations) {
    results.push({ type: 'location', id: l.id, slug: l.slug, name: l.name, description: l.description, snippet: makeSnippet(l.description, query), score: scoreResult(l.name, l.description, query) });
  }

  results.sort((a, b) => b.score - a.score);
  const total = results.length;
  const paginated = results.slice(skip, skip + limit);

  return {
    data: paginated,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
