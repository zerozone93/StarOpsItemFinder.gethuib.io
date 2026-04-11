import 'dotenv/config';
import fs from 'node:fs/promises';
import { buildApp } from '../app.js';

const app = await buildApp();
const spec = app.swagger();
await fs.writeFile('openapi.json', JSON.stringify(spec, null, 2), 'utf8');
await app.close();
console.log('Wrote openapi.json');
