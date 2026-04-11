import { fetchText } from "../lib/http.mjs";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function textExcerpt(text, max = 700) {
  return String(text || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function uniq(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function makeLocation(name, type = "location") {
  return {
    id: `location:${slugify(name)}`,
    slug: slugify(name),
    name,
    category: type
  };
}

function makeVendor(name, locationName, extra = {}) {
  return {
    id: `vendor:${slugify(name)}`,
    slug: slugify(name),
    name,
    category: "vendor",
    locationIds: locationName ? [`location:${slugify(locationName)}`] : [],
    ...extra
  };
}

function extractMatches(html, patterns) {
  const results = [];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      if (match[0]) {
        results.push(match[0].trim());
      }
    }
  }
  return uniq(results);
}

function uniqByJson(items) {
  const seen = new Set();
  const output = [];

  for (const item of items || []) {
    const key = JSON.stringify(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }

  return output;
}

function buildEmptyDataset(meta) {
  return {
    meta,
    systems: [],
    locations: [],
    resources: [],
    miningMethods: [],
    tools: [],
    vehicles: [],
    vendors: [],
    lootSources: [],
    weapons: [],
    armor: [],
    blueprints: [],
    recipes: []
  };
}

function dedupeBySlug(items) {
  const map = new Map();

  for (const item of items || []) {
    const existing = map.get(item.slug);

    if (!existing) {
      map.set(item.slug, item);
      continue;
    }

    map.set(item.slug, {
      ...existing,
      ...item,
      tags: uniq([...(existing.tags || []), ...(item.tags || [])]),
      sourceReferences: uniqByJson([
        ...(existing.sourceReferences || []),
        ...(item.sourceReferences || [])
      ]),
      confidenceScore: Math.max(existing.confidenceScore || 0, item.confidenceScore || 0)
    });
  }

  return Array.from(map.values());
}

export async function fetchErkulData() {
  const meta = {
    sourceKey: "erkul",
    sourceName: "Erkul",
    fetchedAt: new Date().toISOString(),
    priority: 50
  };

  const dataset = buildEmptyDataset(meta);

  const targets = [
    { key: "shop", url: "https://www.erkul.games/live/shops" },
    { key: "fpsWeapons", url: "https://www.erkul.games/live/calculator" },
    { key: "vehicles", url: "https://www.erkul.games/live/ships" },
    { key: "index", url: "https://www.erkul.games/" }
  ];

  const fetchedPages = [];

  for (const target of targets) {
    try {
      const html = await fetchText(target.url, {
        headers: {
          "user-agent": "StarOpsItemFinderBot/1.0 (GitHub Actions importer)"
        }
      });

      fetchedPages.push({
        key: target.key,
        url: target.url,
        excerpt: textExcerpt(html, 1200)
      });

      const locationNames = extractMatches(html, [
        /\b(?:Area18|Lorville|New Babbage|Orison|GrimHEX|Area 18|Port Tressler|Everus Harbor|Baijini Point|Seraphim Station)\b/gi
      ]);

      for (const locationName of locationNames) {
        dataset.locations.push(makeLocation(locationName.replace(/\s+/g, " ").trim()));
      }

      const vendorNames = extractMatches(html, [
        /\b(?:CenterMass|Skutters|Live Fire Weapons|Cubby Blast|Casaba Outlet|Tammany and Sons)\b/gi
      ]);

      for (const vendorName of vendorNames) {
        dataset.vendors.push(
          makeVendor(vendorName, null, {
            description: `Referenced by Erkul page ${target.url}`,
            verificationStatus: "partial",
            confidenceScore: 0.45,
            sourceReferences: [{ source: "erkul", url: target.url }]
          })
        );
      }

      const weaponNames = extractMatches(html, [
        /\b(?:P4-AR|P8-SC|S71|FS-9|A03|Arrowhead|Custodian|Coda|Gallant)\b/gi
      ]);

      for (const weaponName of weaponNames) {
        dataset.weapons.push({
          id: `weapon:${slugify(weaponName)}`,
          slug: slugify(weaponName),
          name: weaponName,
          description: `Referenced by Erkul page ${target.url}`,
          verificationStatus: "partial",
          confidenceScore: 0.4,
          sourceReferences: [{ source: "erkul", url: target.url }],
          tags: ["erkul-reference"]
        });
      }

      const armorNames = extractMatches(html, [
        /\b(?:ADP|Aril|Defiance|DustUp|Inquisitor|Pembroke|Novikov)\b/gi
      ]);

      for (const armorName of armorNames) {
        dataset.armor.push({
          id: `armor:${slugify(armorName)}`,
          slug: slugify(armorName),
          name: armorName,
          description: `Referenced by Erkul page ${target.url}`,
          verificationStatus: "partial",
          confidenceScore: 0.4,
          sourceReferences: [{ source: "erkul", url: target.url }],
          tags: ["erkul-reference"]
        });
      }
    } catch (error) {
      fetchedPages.push({
        key: target.key,
        url: target.url,
        error: error.message
      });
    }
  }

  dataset.lootSources.push({
    id: "lootsource:erkul-pages",
    slug: "erkul-pages",
    name: "Erkul page scan",
    description: "Supplementary scan of Erkul public pages for items, shops, and location references.",
    verificationStatus: "partial",
    confidenceScore: 0.35,
    sourceReferences: fetchedPages.map((page) => ({
      source: "erkul",
      url: page.url,
      note: page.error ? `error: ${page.error}` : "page fetched"
    }))
  });

  dataset._rawPages = fetchedPages;
  dataset.locations = dedupeBySlug(dataset.locations);
  dataset.vendors = dedupeBySlug(dataset.vendors);
  dataset.weapons = dedupeBySlug(dataset.weapons);
  dataset.armor = dedupeBySlug(dataset.armor);

  return dataset;
}