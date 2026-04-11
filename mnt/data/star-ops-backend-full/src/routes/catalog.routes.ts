import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { entityNames, type EntityName } from '../types/shared.js';
import { listEntities, getEntityByIdOrSlug } from '../services/catalog.service.js';
import { idParamSchema } from '../validators/common.js';

const catalogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  obtainMethod: z.string().optional()
});

export async function catalogRoutes(app: FastifyInstance) {
  for (const entity of entityNames) {
    app.get(`/${entity}`, async (request) => {
      const query = catalogQuerySchema.parse(request.query);
      return listEntities(entity as EntityName, query);
    });

    app.get(`/${entity}/:idOrSlug`, async (request) => {
      const params = idParamSchema.parse(request.params);
      return getEntityByIdOrSlug(entity as EntityName, params.idOrSlug);
    });
  }
}
