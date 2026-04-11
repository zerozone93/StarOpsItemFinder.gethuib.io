export function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.includes(q)) return 80;
  let score = 0;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score++;
      qi++;
    }
  }
  if (qi < q.length) return 0;
  return Math.round((score / Math.max(t.length, q.length)) * 60);
}

export function fuzzySearch<T extends { name: string; tags: string[] }>(
  items: T[],
  query: string,
  threshold = 30
): T[] {
  const q = query.toLowerCase().trim();
  if (!q) return items;

  return items
    .map((item) => ({
      item,
      score: Math.max(
        fuzzyScore(item.name, q),
        ...item.tags.map((t) => fuzzyScore(t, q))
      ),
    }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
