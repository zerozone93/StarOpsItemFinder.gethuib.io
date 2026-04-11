import { Request, Response } from 'express';
import prisma from '../db/prisma.js';

export async function getVendors(req: Request, res: Response): Promise<void> {
  const { q, category, page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q } }, { description: { contains: q } }];
  if (category) where.category = category;

  const [total, data] = await Promise.all([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({ where, skip, take: limitNum, orderBy: { name: 'asc' }, include: { locations: { include: { location: true } }, weapons: { include: { weapon: true } }, armor: { include: { armor: true } } } }),
  ]);

  res.json({ data, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
}

export async function getVendorBySlug(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const vendor = await prisma.vendor.findUnique({ where: { slug }, include: { locations: { include: { location: true } }, weapons: { include: { weapon: true } }, armor: { include: { armor: true } } } });
  if (!vendor) { res.status(404).json({ error: 'Vendor not found' }); return; }
  res.json(vendor);
}
