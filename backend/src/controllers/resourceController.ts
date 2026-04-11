import { Request, Response } from 'express';
import prisma from '../db/prisma.js';

export async function getResources(req: Request, res: Response): Promise<void> {
  const { q, category, rarity, page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q } }, { description: { contains: q } }];
  if (category) where.category = category;
  if (rarity) where.rarity = rarity;

  const [total, data] = await Promise.all([
    prisma.resource.count({ where }),
    prisma.resource.findMany({ where, skip, take: limitNum, orderBy: { name: 'asc' }, include: { locations: { include: { location: true } }, miningMethods: { include: { miningMethod: true } } } }),
  ]);

  res.json({ data, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
}

export async function getResourceBySlug(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const resource = await prisma.resource.findUnique({
    where: { slug },
    include: { locations: { include: { location: true } }, miningMethods: { include: { miningMethod: true } }, recipeIngredients: { include: { recipe: true } } },
  });
  if (!resource) { res.status(404).json({ error: 'Resource not found' }); return; }
  res.json(resource);
}
