import { Request, Response } from 'express';
import prisma from '../db/prisma.js';

export async function getLocations(req: Request, res: Response): Promise<void> {
  const { q, category, systemId, page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q } }, { description: { contains: q } }];
  if (category) where.category = category;
  if (systemId) where.systemId = systemId;

  const [total, data] = await Promise.all([
    prisma.location.count({ where }),
    prisma.location.findMany({ where, skip, take: limitNum, orderBy: { name: 'asc' }, include: { resources: { include: { resource: true } }, vendors: { include: { vendor: true } } } }),
  ]);

  res.json({ data, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
}

export async function getLocationBySlug(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const location = await prisma.location.findUnique({ where: { slug }, include: { resources: { include: { resource: true } }, vendors: { include: { vendor: true } }, children: true } });
  if (!location) { res.status(404).json({ error: 'Location not found' }); return; }
  res.json(location);
}
