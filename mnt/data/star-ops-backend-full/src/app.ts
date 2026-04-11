import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyEnv from '@fastify/env';
import { parseEnv } from './config/env.js';
import authPlugin from './plugins/auth.js';
import swaggerPlugin from './plugins/swagger.js';
import { registerRoutes } from './routes/index.js';
import { HttpError } from './lib/errors.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { translateTime: 'SYS:standard' } }
          : undefined
    }
  });

  const env = parseEnv(process.env);
  app.decorate('config', env);

  await app.register(fastifyEnv, { schema: {}, dotenv: false });
  await app.register(cors, { origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()), credentials: true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(swaggerPlugin);
  await app.register(authPlugin);
  await registerRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: error.message, details: error.details ?? null });
    }

    app.log.error(error);
    return reply.code(500).send({ error: 'Internal Server Error' });
  });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: ReturnType<typeof parseEnv>;
  }
}
