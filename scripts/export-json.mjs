import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const ROOT = process.cwd();

async function run() {
  const mergedPath = path.join(ROOT, "data", "merged", "canonical.json");
  const outPath = path.join(ROOT, "public", "star-citizen-data.json");

  const raw = await readFile(mergedPath, "utf8");
  const data = JSON.parse(raw);

  const appPayload = {
    meta: {
      generatedAt: new Date().toISOString(),
      sourceCount: data.meta?.sourceCount ?? 0,
      notes: [
        "Generated automatically by GitHub Actions",
        "Community sources may be partial or conflict with official sources"
      ]
    },
    systems: data.systems ?? [],
    locations: data.locations ?? [],
    resources: data.resources ?? [],
    miningMethods: data.miningMethods ?? [],
    utility: data.utility ?? data.tools ?? [],
    tools: data.tools ?? [],
    vehicles: data.vehicles ?? [],
    vendors: data.vendors ?? [],
    lootSources: data.lootSources ?? [],
    blueprints: data.blueprints ?? [],
    recipes: data.recipes ?? [],
    weapons: data.weapons ?? [],
    armor: data.armor ?? []
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(appPayload, null, 2));
  console.log(`Wrote ${outPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});