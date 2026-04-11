import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma.js';
import { LoginSchema } from '../validators/authValidator.js';
import { ResourceCreateSchema, ResourceUpdateSchema } from '../validators/resourceValidator.js';
import { WeaponCreateSchema, WeaponUpdateSchema } from '../validators/weaponValidator.js';
import { ArmorCreateSchema, ArmorUpdateSchema } from '../validators/armorValidator.js';
import { LocationCreateSchema, LocationUpdateSchema } from '../validators/locationValidator.js';

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid credentials format' }); return; }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) { res.status(401).json({ error: 'Invalid credentials' }); return; }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: 'Invalid credentials' }); return; }
  const secret = process.env.JWT_SECRET ?? 'fallback-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, secret, { expiresIn } as jwt.SignOptions);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
}

export async function createResource(req: Request, res: Response): Promise<void> {
  const parsed = ResourceCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation error', details: parsed.error.errors }); return; }
  const { tags, ...rest } = parsed.data;
  const resource = await prisma.resource.create({ data: { ...rest, tags: JSON.stringify(tags) } });
  res.status(201).json(resource);
}
export async function updateResource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = ResourceUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation error', details: parsed.error.errors }); return; }
  const { tags, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (tags !== undefined) data.tags = JSON.stringify(tags);
  res.json(await prisma.resource.update({ where: { id }, data }));
}
export async function deleteResource(req: Request, res: Response): Promise<void> {
  await prisma.resource.delete({ where: { id: req.params.id } }); res.status(204).send();
}

export async function createWeapon(req: Request, res: Response): Promise<void> {
  const parsed = WeaponCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation error', details: parsed.error.errors }); return; }
  const { tags, ...rest } = parsed.data;
  res.status(201).json(await prisma.weapon.create({ data: { ...rest, tags: JSON.stringify(tags) } }));
}
export async function updateWeapon(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = WeaponUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation error', details: parsed.error.errors }); return; }
  const { tags, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (tags !== undefined) data.tags = JSON.stringify(tags);
  res.json(await prisma.weapon.update({ where: { id }, data }));
}
export async function deleteWeapon(req: Request, res: Response): Promise<void> {
  await prisma.weapon.delete({ where: { id: req.params.id } }); res.status(204).send();
}

export async function createArmor(req: Request, res: Response): Promise<void> {
  const parsed = ArmorCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation error', details: parsed.error.errors }); return; }
  const { tags, ...rest } = parsed.data;
  res.status(201).json(await prisma.armor.create({ data: { ...rest, tags: JSON.stringify(tags) } }));
}
export async function updateArmor(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = ArmorUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation error', details: parsed.error.errors }); return; }
  const { tags, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (tags !== undefined) data.tags = JSON.stringify(tags);
  res.json(await prisma.armor.update({ where: { id }, data }));
}
export async function deleteArmor(req: Request, res: Response): Promise<void> {
  await prisma.armor.delete({ where: { id: req.params.id } }); res.status(204).send();
}

export async function createLocation(req: Request, res: Response): Promise<void> {
  const parsed = LocationCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation error', details: parsed.error.errors }); return; }
  const { tags, ...rest } = parsed.data;
  res.status(201).json(await prisma.location.create({ data: { ...rest, tags: JSON.stringify(tags) } }));
}
export async function updateLocation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = LocationUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation error', details: parsed.error.errors }); return; }
  const { tags, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (tags !== undefined) data.tags = JSON.stringify(tags);
  res.json(await prisma.location.update({ where: { id }, data }));
}
export async function deleteLocation(req: Request, res: Response): Promise<void> {
  await prisma.location.delete({ where: { id: req.params.id } }); res.status(204).send();
}

export async function createVendor(req: Request, res: Response): Promise<void> {
  const { tags, inventory, ...rest } = req.body;
  res.status(201).json(await prisma.vendor.create({ data: { ...rest, tags: JSON.stringify(tags ?? []), inventory: JSON.stringify(inventory ?? []) } }));
}
export async function updateVendor(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { tags, inventory, ...rest } = req.body;
  const data: Record<string, unknown> = { ...rest };
  if (tags !== undefined) data.tags = JSON.stringify(tags);
  if (inventory !== undefined) data.inventory = JSON.stringify(inventory);
  res.json(await prisma.vendor.update({ where: { id }, data }));
}
export async function deleteVendor(req: Request, res: Response): Promise<void> {
  await prisma.vendor.delete({ where: { id: req.params.id } }); res.status(204).send();
}
