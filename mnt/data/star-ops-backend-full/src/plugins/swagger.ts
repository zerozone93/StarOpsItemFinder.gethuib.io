import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export default fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Star Ops API',
        version: '1.0.0',
        description: 'Backend API for the Star Ops Item Finder application.'
      }
    }
  });

  await app.register(swaggerUi, { routePrefix: '/docs' });
});
