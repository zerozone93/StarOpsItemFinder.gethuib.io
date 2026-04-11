import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { armorInputSchema, resourceInputSchema, vendorInputSchema, weaponInputSchema } from '../validators/entities.js';
import { upsertArmor, upsertResource, upsertVendor, upsertWeapon } from '../services/admin.service.js';

const deleteSchema = z.object({ id: z.string().min(1) });

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  app.post('/resources', async (request) => upsertResource(resourceInputSchema.parse(request.body)));
  app.post('/weapons', async (request) => upsertWeapon(weaponInputSchema.parse(request.body)));
  app.post('/armor', async (request) => upsertArmor(armorInputSchema.parse(request.body)));
  app.post('/vendors', async (request) => upsertVendor(vendorInputSchema.parse(request.body)));

  app.patch('/resources/:id', async (request) => {
    const body = resourceInputSchema.partial().parse(request.body);
    const params = deleteSchema.parse(request.params);
    return prisma.resource.update({ where: { id: params.id }, data: body });
  });

  app.patch('/weapons/:id', async (request) => {
    const body = weaponInputSchema.partial().parse(request.body);
    const params = deleteSchema.parse(request.params);
    return prisma.weapon.update({ where: { id: params.id }, data: body });
  });

  app.patch('/armor/:id', async (request) => {
    const body = armorInputSchema.partial().parse(request.body);
    const params = deleteSchema.parse(request.params);
    return prisma.armor.update({ where: { id: params.id }, data: body });
  });

  app.patch('/vendors/:id', async (request) => {
    const body = vendorInputSchema.partial().parse(request.body);
    const params = deleteSchema.parse(request.params);
    return prisma.vendor.update({ where: { id: params.id }, data: body });
  });

  app.delete('/resources/:id', async (request) => {
    const params = deleteSchema.parse(request.params);
    await prisma.resource.delete({ where: { id: params.id } });
    return { ok: true };
  });

  app.delete('/weapons/:id', async (request) => {
    const params = deleteSchema.parse(request.params);
    await prisma.weapon.delete({ where: { id: params.id } });
    return { ok: true };
  });

  app.delete('/armor/:id', async (request) => {
    const params = deleteSchema.parse(request.params);
    await prisma.armor.delete({ where: { id: params.id } });
    return { ok: true };
  });

  app.delete('/vendors/:id', async (request) => {
    const params = deleteSchema.parse(request.params);
    await prisma.vendor.delete({ where: { id: params.id } });
    return { ok: true };
  });
}
