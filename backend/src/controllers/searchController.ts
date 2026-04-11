import { Request, Response } from 'express';
import { globalSearch } from '../services/searchService.js';

export async function search(req: Request, res: Response): Promise<void> {
  const { q = '', page = '1', limit = '20' } = req.query as Record<string, string>;
  if (!q.trim()) { res.status(400).json({ error: 'Query parameter "q" is required' }); return; }
  const result = await globalSearch(q, parseInt(page, 10), parseInt(limit, 10));
  res.json(result);
}
