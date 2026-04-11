import path from "node:path";
import { readFile } from "node:fs/promises";

const ROOT = process.cwd();

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const mergedPath = path.join(ROOT, "data", "merged", "canonical.json");
  const conflictsPath = path.join(ROOT, "reports", "conflicts.json");
  const failuresPath = path.join(ROOT, "reports", "failures.json");
  const publicDatasetPath = path.join(ROOT, "public", "star-citizen-data.json");
  const splitDir = path.join(ROOT, "public", "data");

  const [merged, conflicts, failures, publicDataset] = await Promise.all([
    readJson(mergedPath),
    readJson(conflictsPath),
    readJson(failuresPath),
    readJson(publicDatasetPath)
  ]);

  assert(Array.isArray(failures), "reports/failures.json must be an array");
  assert(failures.length === 0, `Import failures detected: ${failures.map((entry) => entry.source).join(", ")}`);
  assert(typeof conflicts?.conflictCount === "number", "reports/conflicts.json must contain conflictCount");
  assert(Array.isArray(merged?.resources), "Merged dataset must contain resources");
  assert(Array.isArray(merged?.locations), "Merged dataset must contain locations");
  assert(Array.isArray(merged?.weapons), "Merged dataset must contain weapons");
  assert(Array.isArray(merged?.tools), "Merged dataset must contain tools");
  assert(merged.resources.length > 0, "Merged dataset must contain at least one resource");
  assert(merged.locations.length > 0, "Merged dataset must contain at least one location");

  assert(Array.isArray(publicDataset?.resources), "Public dataset must contain resources");
  assert(Array.isArray(publicDataset?.locations), "Public dataset must contain locations");
  assert(Array.isArray(publicDataset?.weapons), "Public dataset must contain weapons");
  assert(Array.isArray(publicDataset?.utility), "Public dataset must contain utility");

  const splitFiles = [
    "meta.json",
    "systems.json",
    "locations.json",
    "resources.json",
    "miningMethods.json",
    "utility.json",
    "tools.json",
    "vehicles.json",
    "vendors.json",
    "lootSources.json",
    "blueprints.json",
    "recipes.json",
    "weapons.json",
    "armor.json"
  ];

  await Promise.all(
    splitFiles.map(async (fileName) => {
      const value = await readJson(path.join(splitDir, fileName));
      assert(value !== undefined, `Split file ${fileName} must be readable`);
    })
  );

  console.log(
    JSON.stringify(
      {
        resources: publicDataset.resources.length,
        locations: publicDataset.locations.length,
        weapons: publicDataset.weapons.length,
        utility: publicDataset.utility.length,
        conflicts: conflicts.conflictCount,
        validatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});