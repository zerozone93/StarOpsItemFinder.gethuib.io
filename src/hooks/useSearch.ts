import { useState, useMemo } from 'react';

export function useSearch<T extends { name: string; description: string; tags: string[] }>(
  items: T[],
  fields?: (keyof T)[]
): { query: string; setQuery: (q: string) => void; results: T[] } {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item) => {
      const defaultMatch =
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      if (defaultMatch) return true;
      if (fields) {
        return fields.some((f) => {
          const val = item[f];
          if (typeof val === 'string') return val.toLowerCase().includes(q);
          if (Array.isArray(val)) return val.some((v) => typeof v === 'string' && v.toLowerCase().includes(q));
          return false;
        });
      }
      return false;
    });
  }, [items, query, fields]);

  return { query, setQuery, results };
}
