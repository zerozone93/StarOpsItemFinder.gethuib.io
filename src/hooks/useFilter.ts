import { useState, useMemo } from 'react';

export function useFilter<T>(
  items: T[],
  filterKey: keyof T
): { filter: string; setFilter: (f: string) => void; filtered: T[] } {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter) return items;
    return items.filter((item) => {
      const val = item[filterKey];
      return typeof val === 'string' && val === filter;
    });
  }, [items, filter, filterKey]);

  return { filter, setFilter, filtered };
}
