import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { globalSearch } from '../services/search.service.js';

const querySchema = z.object({ q: z.string().min(1) });

export async function searchRoutes(app: FastifyInstance) {
  app.get('/search', async (request) => {
    const query = querySchema.parse(request.query);
    return globalSearch(query.q);
  });
}
