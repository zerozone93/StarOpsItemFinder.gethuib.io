function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeCollections(datasets, key, conflicts) {
  const bySlug = new Map();

  for (const dataset of datasets) {
    const sourceKey = dataset.meta?.sourceKey ?? dataset.meta?.sourceName ?? "unknown";
    const priority = Number(dataset.meta?.priority ?? 0);
    const items = Array.isArray(dataset[key]) ? dataset[key] : [];

    for (const item of items) {
      const identifier = item.slug || slugify(item.name || item.id || `${key}-${bySlug.size + 1}`);
      const normalized = { ...clone(item), slug: identifier };
      const existing = bySlug.get(identifier);

      if (!existing) {
        bySlug.set(identifier, { value: normalized, priority, sourceKey, sources: [sourceKey] });
        continue;
      }

      const conflictFields = [];
      for (const [field, nextValue] of Object.entries(normalized)) {
        if (field === "slug") {
          continue;
        }

        const previousValue = existing.value[field];
        if (previousValue !== undefined && JSON.stringify(previousValue) !== JSON.stringify(nextValue)) {
          conflictFields.push(field);
        }

        if (previousValue === undefined || priority >= existing.priority) {
          existing.value[field] = nextValue;
        }
      }

      existing.priority = Math.max(existing.priority, priority);
      existing.sources = Array.from(new Set([...existing.sources, sourceKey]));

      if (conflictFields.length > 0) {
        conflicts.push({
          collection: key,
          slug: identifier,
          sources: existing.sources,
          fields: conflictFields
        });
      }
    }
  }

  return Array.from(bySlug.values()).map((entry) => ({
    ...entry.value,
    mergedSources: entry.sources
  }));
}

export function mergeDatasets(datasets) {
  const conflicts = [];
  const collections = [
    "systems",
    "locations",
    "resources",
    "miningMethods",
    "tools",
    "vehicles",
    "vendors",
    "lootSources",
    "blueprints",
    "recipes",
    "weapons",
    "armor"
  ];

  const merged = {
    meta: {
      sourceCount: datasets.length,
      generatedAt: new Date().toISOString(),
      sources: datasets.map((dataset) => ({
        sourceKey: dataset.meta?.sourceKey ?? dataset.meta?.sourceName ?? "unknown",
        sourceName: dataset.meta?.sourceName ?? dataset.meta?.sourceKey ?? "unknown",
        priority: dataset.meta?.priority ?? 0,
        fetchedAt: dataset.meta?.fetchedAt ?? null,
        skipped: dataset.meta?.skipped ?? false
      }))
    }
  };

  for (const collection of collections) {
    merged[collection] = mergeCollections(datasets, collection, conflicts);
  }

  merged.meta.conflictCount = conflicts.length;
  merged.meta.conflicts = conflicts;
  return merged;
}

export function buildConflictReport(merged) {
  return {
    generatedAt: new Date().toISOString(),
    sourceCount: merged.meta?.sourceCount ?? 0,
    conflictCount: merged.meta?.conflictCount ?? 0,
    conflicts: merged.meta?.conflicts ?? []
  };
}