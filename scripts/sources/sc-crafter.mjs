import { fetchText, getJson } from "../lib/http.mjs";

const API_BASE = "https://www.sc-crafter.com/api";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function normalizeHint(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatQuantity(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  if (Number.isInteger(num)) {
    return String(num);
  }
  return String(Number(num.toFixed(3)));
}

function formatIngredientAmount(ingredient) {
  const quantity = formatQuantity(ingredient?.quantity_scu);
  const unit = String(ingredient?.unit || "unit").toLowerCase();
  if (!quantity) {
    return unit;
  }
  if (unit === "scu") {
    return `${quantity} SCU`;
  }
  if (unit === "item") {
    return `${quantity} item`;
  }
  return `${quantity} ${unit}`;
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

function parseBlueprintCards(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const results = [];
  let current = null;

  for (const line of lines) {
    if (/^Showing \d+-\d+ of \d+/.test(line)) continue;
    if (/^Page \d+ of \d+/.test(line)) continue;
    if (/^Crafting Blueprints$/i.test(line)) continue;

    const looksLikeHeader =
      !current &&
      /^[A-Z0-9].+/.test(line) &&
      !/^(Search|Per page|Results per page|Add|Not selected|Support on|Discord|Copy List|Clear Cart)/i.test(line);

    if (looksLikeHeader) {
      current = {
        name: line,
        craftTimeSeconds: null,
        ingredients: [],
        category: null
      };
      continue;
    }

    if (!current) continue;

    const timeMatch = line.match(/\b(\d+)s\b/);
    if (timeMatch && current.craftTimeSeconds == null) {
      current.craftTimeSeconds = Number(timeMatch[1]);
    }

    if (
      !current.category &&
      /\b(sniper|rifle|pistol|smg|shotgun|ballistic|energy|combat|heavy|medium|light|undersuit)\b/i.test(line)
    ) {
      current.category = line;
    }

    const ingredientRegex =
      /\b([A-Z][A-Za-z0-9' -]+)\s+((?:\d+(?:\.\d+)?)\s*(?:SCU|Gem|g|kg|units?|plates?|packs?))/g;

    let ingredientMatch;
    while ((ingredientMatch = ingredientRegex.exec(line)) !== null) {
      current.ingredients.push({
        name: ingredientMatch[1].trim(),
        amount: ingredientMatch[2].trim()
      });
    }

    if (/^Add\b/i.test(line) || /^Looking for\b/i.test(line)) {
      if (current.name) results.push(current);
      current = null;
    }
  }

  if (current?.name) results.push(current);

  return results;
}

function inferItemType(name, categoryLine) {
  const combined = `${name} ${categoryLine || ""}`.toLowerCase();
  if (
    combined.includes("helmet") ||
    combined.includes("arms") ||
    combined.includes("legs") ||
    combined.includes("core") ||
    combined.includes("torso") ||
    combined.includes("combat") ||
    combined.includes("undersuit") ||
    combined.includes("heavy") ||
    combined.includes("medium") ||
    combined.includes("light")
  ) {
    return "armor";
  }

  if (
    combined.includes("rifle") ||
    combined.includes("sniper") ||
    combined.includes("shotgun") ||
    combined.includes("pistol") ||
    combined.includes("smg") ||
    combined.includes("launcher") ||
    combined.includes("railgun") ||
    combined.includes("knife") ||
    combined.includes("weapon")
  ) {
    return "weapon";
  }

  return "item";
}

function createResourceAggregate(name) {
  const slug = slugify(name);
  return {
    id: `resource:${slug}`,
    slug,
    name,
    description: "Crafting ingredient referenced by SC Crafter",
    verificationStatus: "community_verified",
    confidenceScore: 0.7,
    recipeIds: new Set(),
    sourceReferences: []
  };
}

function buildDatasetFromApi(meta, summary, blueprints) {
  const dataset = buildEmptyDataset(meta);
  const resourcesBySlug = new Map();
  const weaponsBySlug = new Map();
  const armorBySlug = new Map();

  const sourceUrl = `${API_BASE}/blueprints`;

  for (const blueprint of blueprints) {
    const baseSlug = slugify(`${blueprint.name || "blueprint"}-${blueprint.id || "unknown"}`);
    const category = blueprint.category || null;
    const blueprintId = `blueprint:${baseSlug}`;
    const recipeId = `recipe:${baseSlug}`;
    const contractNames = uniq(
      [...(blueprint.contracts || []), ...(blueprint.missions || [])]
        .map((entry) => normalizeHint(entry?.name))
        .filter(Boolean)
    );

    dataset.blueprints.push({
      id: blueprintId,
      slug: baseSlug,
      name: blueprint.name,
      description: "Blueprint imported from SC Crafter API",
      verificationStatus: "community_verified",
      confidenceScore: 0.85,
      sourceReferences: [{ source: "sc-crafter", url: sourceUrl }],
      craftTimeSeconds: Number(blueprint.craft_time_seconds) || null,
      tiers: Number(blueprint.tiers) || null,
      category,
      craftsCategory: category,
      acquisitionHints: contractNames,
      tags: uniq([
        "crafting",
        "blueprint",
        category,
        blueprint.version,
        contractNames.length ? "mission-drop" : null
      ])
    });

    dataset.recipes.push({
      id: recipeId,
      slug: baseSlug,
      name: blueprint.name,
      description: `Recipe imported from SC Crafter API (${(blueprint.ingredients || []).length} ingredients)`,
      verificationStatus: "community_verified",
      confidenceScore: 0.85,
      sourceReferences: [{ source: "sc-crafter", url: sourceUrl }],
      blueprintIds: [blueprintId],
      ingredients: (blueprint.ingredients || []).map((ingredient) => ({
        name: ingredient.name,
        amount: formatIngredientAmount(ingredient),
        slot: ingredient.slot || null,
        minQuality: Number(ingredient.min_quality) || 0
      })),
      craftTimeSeconds: Number(blueprint.craft_time_seconds) || null,
      dropSources: contractNames
    });

    const itemType = inferItemType(blueprint.name, blueprint.category);
    if (itemType === "weapon" || itemType === "armor") {
      const map = itemType === "weapon" ? weaponsBySlug : armorBySlug;
      const idPrefix = itemType;
      const existing = map.get(baseSlug);
      const next = {
        id: `${idPrefix}:${baseSlug}`,
        slug: baseSlug,
        name: blueprint.name,
        description: `${itemType === "weapon" ? "Weapon" : "Armor"} blueprint/item reference imported from SC Crafter API`,
        class: category || null,
        category,
        verificationStatus: "community_verified",
        confidenceScore: 0.8,
        recipeIds: uniq([...(existing?.recipeIds || []), recipeId]),
        blueprintIds: uniq([...(existing?.blueprintIds || []), blueprintId]),
        sourceReferences: uniq([...(existing?.sourceReferences || []), { source: "sc-crafter", url: sourceUrl }])
      };
      map.set(baseSlug, next);
    }

    for (const ingredient of blueprint.ingredients || []) {
      const resourceName = String(ingredient?.name || "").trim();
      if (!resourceName) {
        continue;
      }
      const resourceSlug = slugify(resourceName);
      const existing = resourcesBySlug.get(resourceSlug) || createResourceAggregate(resourceName);
      existing.recipeIds.add(recipeId);
      existing.sourceReferences.push({ source: "sc-crafter", url: sourceUrl });
      resourcesBySlug.set(resourceSlug, existing);
    }
  }

  dataset.resources = Array.from(resourcesBySlug.values()).map((resource) => ({
    ...resource,
    recipeIds: Array.from(resource.recipeIds),
    sourceReferences: uniq(resource.sourceReferences)
  }));

  dataset.weapons = Array.from(weaponsBySlug.values());
  dataset.armor = Array.from(armorBySlug.values());

  dataset.lootSources.push({
    id: "lootsource:sc-crafter-import",
    slug: "sc-crafter-import",
    name: "SC Crafter API import run",
    description: "High-coverage crafting import from SC Crafter API",
    verificationStatus: "community_verified",
    confidenceScore: 0.85,
    sourceReferences: [
      {
        source: "sc-crafter",
        url: `${API_BASE}/summary`,
        note: `source version ${summary?.version || "unknown"}`
      },
      {
        source: "sc-crafter",
        url: sourceUrl,
        note: `parsed ${blueprints.length} blueprints`
      }
    ]
  });

  return dataset;
}

async function buildDatasetFromFallback(meta) {
  const dataset = buildEmptyDataset(meta);
  const targets = [
    "https://www.sc-crafter.com/",
    "https://www.sc-crafter.com/?type=Armor",
    "https://www.sc-crafter.com/?type=Weapons",
    "https://www.sc-crafter.com/?type=Ammo"
  ];
  const fetched = [];

  for (const url of targets) {
    try {
      const html = await fetchText(url, {
        headers: {
          "user-agent": "StarOpsItemFinderBot/1.0 (GitHub Actions importer)"
        }
      });

      const text = stripHtml(html);
      const cards = parseBlueprintCards(text);

      fetched.push({
        url,
        blueprintCount: cards.length
      });

      for (const card of cards) {
        const blueprintSlug = slugify(card.name);

        dataset.blueprints.push({
          id: `blueprint:${blueprintSlug}`,
          slug: blueprintSlug,
          name: card.name,
          description: "Blueprint imported from SC Crafter fallback scrape",
          verificationStatus: "partial",
          confidenceScore: 0.55,
          sourceReferences: [{ source: "sc-crafter", url }],
          craftTimeSeconds: card.craftTimeSeconds,
          tags: uniq(["crafting", "blueprint", ...(card.category ? [card.category] : [])])
        });

        dataset.recipes.push({
          id: `recipe:${blueprintSlug}`,
          slug: blueprintSlug,
          name: card.name,
          description: "Recipe imported from SC Crafter fallback scrape",
          verificationStatus: "partial",
          confidenceScore: 0.55,
          sourceReferences: [{ source: "sc-crafter", url }],
          blueprintIds: [`blueprint:${blueprintSlug}`],
          ingredients: card.ingredients.map((ing) => ({
            name: ing.name,
            amount: ing.amount
          })),
          craftTimeSeconds: card.craftTimeSeconds
        });

        const itemType = inferItemType(card.name, card.category);

        if (itemType === "weapon") {
          dataset.weapons.push({
            id: `weapon:${blueprintSlug}`,
            slug: blueprintSlug,
            name: card.name,
            description: "Weapon blueprint/item reference imported from SC Crafter fallback scrape",
            verificationStatus: "partial",
            confidenceScore: 0.5,
            recipeIds: [`recipe:${blueprintSlug}`],
            blueprintIds: [`blueprint:${blueprintSlug}`],
            sourceReferences: [{ source: "sc-crafter", url }]
          });
        } else if (itemType === "armor") {
          dataset.armor.push({
            id: `armor:${blueprintSlug}`,
            slug: blueprintSlug,
            name: card.name,
            description: "Armor blueprint/item reference imported from SC Crafter fallback scrape",
            verificationStatus: "partial",
            confidenceScore: 0.5,
            recipeIds: [`recipe:${blueprintSlug}`],
            blueprintIds: [`blueprint:${blueprintSlug}`],
            sourceReferences: [{ source: "sc-crafter", url }]
          });
        }

        for (const ing of card.ingredients) {
          const resourceSlug = slugify(ing.name);
          dataset.resources.push({
            id: `resource:${resourceSlug}`,
            slug: resourceSlug,
            name: ing.name,
            description: "Crafting ingredient referenced by SC Crafter fallback scrape",
            verificationStatus: "partial",
            confidenceScore: 0.5,
            recipeIds: [`recipe:${blueprintSlug}`],
            sourceReferences: [{ source: "sc-crafter", url }]
          });
        }
      }
    } catch (error) {
      fetched.push({ url, error: error.message });
    }
  }

  dataset.lootSources.push({
    id: "lootsource:sc-crafter-import",
    slug: "sc-crafter-import",
    name: "SC Crafter fallback import run",
    description: "Supplementary fallback scrape import from SC Crafter",
    verificationStatus: "partial",
    confidenceScore: 0.45,
    sourceReferences: fetched.map((x) => ({
      source: "sc-crafter",
      url: x.url,
      note: x.error ? `error: ${x.error}` : `parsed ${x.blueprintCount} cards`
    }))
  });

  return dataset;
}

export async function fetchScCrafterData() {
  const meta = {
    sourceKey: "sc-crafter",
    sourceName: "SC Crafter",
    fetchedAt: new Date().toISOString(),
    priority: 55
  };

  try {
    const [summary, blueprints] = await Promise.all([
      getJson(`${API_BASE}/summary`),
      getJson(`${API_BASE}/blueprints`)
    ]);

    if (Array.isArray(blueprints) && blueprints.length > 0) {
      return buildDatasetFromApi(meta, summary, blueprints);
    }
  } catch (error) {
    // Fall through to the fallback scraper if the API is unavailable.
  }

  return buildDatasetFromFallback(meta);
}