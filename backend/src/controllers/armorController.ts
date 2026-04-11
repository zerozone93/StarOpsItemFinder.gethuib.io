import { Request, Response } from 'express';
import prisma from '../db/prisma.js';

export async function getArmor(req: Request, res: Response): Promise<void> {
  const { q, category, page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q } }, { description: { contains: q } }];
  if (category) where.category = category;

  const [total, data] = await Promise.all([
    prisma.armor.count({ where }),
    prisma.armor.findMany({ where, skip, take: limitNum, orderBy: { name: 'asc' }, include: { vendors: { include: { vendor: true } } } }),
  ]);

  res.json({ data, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
}

export async function getArmorBySlug(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const armor = await prisma.armor.findUnique({ where: { slug }, include: { vendors: { include: { vendor: true } } } });
  if (!armor) { res.status(404).json({ error: 'Armor not found' }); return; }
  res.json(armor);
}
