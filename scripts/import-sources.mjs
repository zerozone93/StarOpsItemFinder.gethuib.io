import path from "node:path";
import { fetchRsiData } from "./sources/rsi.mjs";
import { fetchStarCitizenToolsData } from "./sources/starcitizentools.mjs";
import { fetchRedditData } from "./sources/reddit.mjs";
import { fetchErkulData } from "./sources/erkul.mjs";
import { fetchScCrafterData } from "./sources/sc-crafter.mjs";
import { mergeDatasets, buildConflictReport } from "./lib/normalize.mjs";
import { ensureDir, writeJson } from "./lib/store.mjs";

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, "data", "raw");
const MERGED_DIR = path.join(ROOT, "data", "merged");
const REPORTS_DIR = path.join(ROOT, "reports");

const CONFIG = {
  rsi: { enabled: true, priority: 100 },
  starCitizenTools: { enabled: true, priority: 90 },
  uex: { enabled: true, priority: 80 },
  reddit: { enabled: true, priority: 30 },
  erkul: { enabled: true, priority: 50 },
  scCrafter: { enabled: true, priority: 55 }
};

const fetchRSI = fetchRsiData;
const fetchStarCitizenTools = fetchStarCitizenToolsData;
const fetchReddit = fetchRedditData;

async function fetchUEX() {
  return {
    meta: { sourceName: "UEX", skipped: true, reason: "UEX source not implemented yet" },
    systems: [],
    locations: [],
    resources: [],
    miningMethods: [],
    tools: [],
    vehicles: [],
    vendors: [],
    lootSources: [],
    blueprints: [],
    recipes: [],
    weapons: [],
    armor: []
  };
}

async function run() {
  await ensureDir(RAW_DIR);
  await ensureDir(MERGED_DIR);
  await ensureDir(REPORTS_DIR);

  const results = [];
  const failures = [];

  const jobs = [
    ["rsi", fetchRSI],
    ["starCitizenTools", fetchStarCitizenTools],
    ["uex", fetchUEX],
    ["reddit", fetchReddit],
    ["erkul", fetchErkulData],
    ["scCrafter", fetchScCrafterData]
  ];

  for (const [name, fn] of jobs) {
    if (!CONFIG[name]?.enabled) {
      console.log(`[skip] ${name} disabled`);
      continue;
    }

    try {
      console.log(`[start] ${name}`);
      const dataset = await fn();
      const sourceKeyByTask = {
        starCitizenTools: "starcitizentools",
        scCrafter: "sc-crafter"
      };
      const sourceKey = sourceKeyByTask[name] || name;
      dataset.meta = {
        ...(dataset.meta || {}),
        sourceKey,
        priority: CONFIG[name].priority,
        fetchedAt: new Date().toISOString()
      };
      results.push(dataset);
      await writeJson(path.join(RAW_DIR, `${sourceKey}.json`), dataset);
      if (name === "scCrafter") {
        const data = dataset;
        await writeJson(path.join(RAW_DIR, "sc-crafter.json"), data);
      }
      console.log(`[done] ${name}`);
    } catch (error) {
      console.error(`[fail] ${name}`, error.message);
      failures.push({ source: name, error: error.message });
    }
  }

  const merged = mergeDatasets(results);
  const conflicts = buildConflictReport(merged);

  await writeJson(path.join(MERGED_DIR, "canonical.json"), merged);
  await writeJson(path.join(REPORTS_DIR, "conflicts.json"), conflicts);
  await writeJson(path.join(REPORTS_DIR, "failures.json"), failures);

  console.log("Import complete");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});