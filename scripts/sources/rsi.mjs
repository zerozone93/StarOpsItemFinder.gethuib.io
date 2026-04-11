import { getText } from "../lib/http.mjs";

export async function fetchRsiData() {
  const sources = [
    "https://robertsspaceindustries.com/comm-link/transmission/19652-Crafting-Gameplay-Guide",
    "https://robertsspaceindustries.com/comm-link/Patch-Notes"
  ];

  const pages = [];
  for (const url of sources) {
    try {
      const html = await getText(url, {
        headers: {
          "user-agent": "StarOpsItemFinderBot/1.0 (+GitHub Actions importer)"
        }
      });

      pages.push({
        url,
        excerpt: html.slice(0, 5000)
      });
    } catch (err) {
      pages.push({
        url,
        error: err.message
      });
    }
  }

  return {
    meta: {
      sourceName: "Roberts Space Industries"
    },
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
    armor: [],
    rawPages: pages
  };
}