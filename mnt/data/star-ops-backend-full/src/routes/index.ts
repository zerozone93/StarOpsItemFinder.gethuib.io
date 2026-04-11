import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';
import { searchRoutes } from './search.routes.js';
import { assistantRoutes } from './assistant.routes.js';
import { catalogRoutes } from './catalog.routes.js';
import { adminRoutes } from './admin.routes.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(searchRoutes, { prefix: '/api' });
  await app.register(assistantRoutes, { prefix: '/api' });
  await app.register(catalogRoutes, { prefix: '/api' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
}
