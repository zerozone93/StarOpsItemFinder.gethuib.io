export function getPagination(page = 1, pageSize = 20): { skip: number; take: number } {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 1), 100) : 20;
  return {
    skip: (safePage - 1) * safePageSize,
    take: safePageSize
  };
}
