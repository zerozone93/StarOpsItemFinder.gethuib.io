import { Request, Response } from 'express';
import prisma from '../db/prisma.js';

export async function getRecipes(req: Request, res: Response): Promise<void> {
  const { q, page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q } }, { description: { contains: q } }];

  const [total, data] = await Promise.all([
    prisma.recipe.count({ where }),
    prisma.recipe.findMany({ where, skip, take: limitNum, orderBy: { name: 'asc' }, include: { ingredients: { include: { resource: true } } } }),
  ]);

  res.json({ data, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
}
