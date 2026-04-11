import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const ROOT = process.cwd();
const publicDatasetPath = path.join(ROOT, "public", "star-citizen-data.json");
const splitDir = path.join(ROOT, "public", "data");

const splitFiles = {
  meta: (data) => data.meta ?? {},
  systems: (data) => data.systems ?? [],
  locations: (data) => data.locations ?? [],
  resources: (data) => data.resources ?? [],
  miningMethods: (data) => data.miningMethods ?? [],
  utility: (data) => data.utility ?? data.tools ?? [],
  tools: (data) => data.tools ?? [],
  vehicles: (data) => data.vehicles ?? [],
  vendors: (data) => data.vendors ?? [],
  lootSources: (data) => data.lootSources ?? [],
  blueprints: (data) => data.blueprints ?? [],
  recipes: (data) => data.recipes ?? [],
  weapons: (data) => data.weapons ?? [],
  armor: (data) => data.armor ?? []
};

async function run() {
  const raw = await readFile(publicDatasetPath, "utf8");
  const dataset = JSON.parse(raw);

  await mkdir(splitDir, { recursive: true });

  for (const [name, getValue] of Object.entries(splitFiles)) {
    const outPath = path.join(splitDir, `${name}.json`);
    await writeFile(outPath, JSON.stringify(getValue(dataset), null, 2));
    console.log(`Wrote ${outPath}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});