import 'dotenv/config';
import { buildApp } from './app.js';

const app = await buildApp();

try {
  await app.listen({ port: app.config.PORT, host: app.config.HOST });
  app.log.info(`Server running at http://${app.config.HOST}:${app.config.PORT}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
