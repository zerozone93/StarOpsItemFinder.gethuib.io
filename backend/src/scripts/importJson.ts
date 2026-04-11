import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { importData } from '../services/importService.js';
import prisma from '../db/prisma.js';
async function main() {
  const jsonPath = process.argv[2] ?? path.resolve(process.cwd(), '../public/star-citizen-data.json');
  if (!fs.existsSync(jsonPath)) { console.error(`File not found: ${jsonPath}`); process.exit(1); }
  console.log(`📂 Importing from: ${jsonPath}`);
  const summary = await importData(JSON.parse(fs.readFileSync(jsonPath, 'utf-8')));
  console.log('✅ Import complete:', JSON.stringify(summary, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
