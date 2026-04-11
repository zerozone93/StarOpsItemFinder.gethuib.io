export function scoreTextMatch(query: string, values: Array<string | null | undefined>): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  return values.reduce((score, value) => {
    const v = (value ?? '').toLowerCase();
    if (!v) return score;
    if (v === q) return score + 120;
    if (v.startsWith(q)) return score + 80;
    if (v.includes(q)) return score + 40;
    if (levenshtein(v.slice(0, Math.min(v.length, q.length + 3)), q) <= 2) return score + 20;
    return score;
  }, 0);
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
}
