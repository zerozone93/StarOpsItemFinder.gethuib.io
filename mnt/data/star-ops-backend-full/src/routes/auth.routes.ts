import type { FastifyInstance } from 'fastify';
import { loginSchema } from '../validators/auth.js';
import { loginAdmin } from '../services/auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const admin = await loginAdmin(body.email, body.password);
    const token = await reply.jwtSign({ sub: admin.id, email: admin.email, role: 'admin' });
    return { token, admin: { id: admin.id, email: admin.email } };
  });
}
