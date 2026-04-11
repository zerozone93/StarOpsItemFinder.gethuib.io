import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'src', 'data', 'generated');
const PUBLIC_DIR = path.join(ROOT, 'public');
const REPORTS_DIR = path.join(ROOT, 'reports');

const USER_AGENT = process.env.USER_AGENT || 'StarOpsItemFinderBot/1.0';
const UEX_TOKEN = process.env.UEX_API_KEY || '';
const UEX_BASE = process.env.UEX_BASE || 'https://api.uexcorp.space/2.0';
const WIKI_BASE = 'https://api.star-citizen.wiki';

const WEAPON_CLASSES = [
  'assault-rifle','shotgun','sniper-rifle','submachine-gun','pistol','knife','grenade','grenade-launcher','railgun','rocket-launcher','shouldered-weapon','sidearm-weapon','lmg','missile-launcher'
];

const ARMOR_FAMILIES = [
  'ADP','ADP-mk4','Antium','Arden-SL','Aril','Artimex','Aves','Aztalan','Bastion','Calico','Carrion','Citadel','Clash','Corbel','Defiance','Dust Devil','DustUp','FBL-8a','Field Recon Suit','Geist Epoque','Geist Stealth','Inquisitor','Lynx','MacFlex','Microid Battle Suit','Morozov-SH','Odyssey II','ORC-mkV','ORC-mkX','Overlord','Palatino','Pembroke','Novikov','Strata','Stitcher'
];

const ATTACHMENT_GROUPS = [
  'barrel-attachments','magazines','multi-tool-attachments','optics-attachments','underbarrel-attachments'
];

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }
async function writeJson(file, data) { await ensureDir(path.dirname(file)); await fs.writeFile(file, JSON.stringify(data, null, 2)); }
function slugify(v='') { return String(v).toLowerCase().replace(/['"]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function uniq(arr) { return [...new Set((arr||[]).filter(Boolean))]; }

async function getJson(url, headers={}) {
  const res = await fetch(url, { headers: { accept: 'application/json', 'user-agent': USER_AGENT, ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function normalizeRecord(type, item, extra={}) {
  const name = item.name || item.title || item.slug || item.uuid || 'unknown';
  const slug = item.slug || slugify(name);
  return {
    id: `${type}:${slug}`,
    slug,
    name,
    type,
    description: item.description || item.section || '',
    manufacturer: item.manufacturer?.name || item.company_name || item.manufacturer || null,
    category: item.category || item.class_name || item.sub_type || null,
    classification: item.classification || null,
    verificationStatus: item.verificationStatus || extra.verificationStatus || 'partial',
    confidenceScore: item.confidenceScore ?? extra.confidenceScore ?? 0.5,
    sourceReferences: uniq([...(item.sourceReferences||[]), ...(extra.sourceReferences||[])]),
    locationIds: uniq(item.locationIds || extra.locationIds || []),
    vendorIds: uniq(item.vendorIds || extra.vendorIds || []),
    tags: uniq([...(item.tags||[]), ...(extra.tags||[])]),
    ...item,
  };
}

async function fetchWikiItems(endpoint) {
  return getJson(`${WIKI_BASE}${endpoint}`);
}

async function fetchUex(resource) {
  if (!UEX_TOKEN) return { status: 'skipped', data: [] };
  return getJson(`${UEX_BASE}${resource}`, { Authorization: `Bearer ${UEX_TOKEN}` });
}

async function main() {
  await ensureDir(OUT_DIR); await ensureDir(PUBLIC_DIR); await ensureDir(REPORTS_DIR);

  const report = { generatedAt: new Date().toISOString(), warnings: [] };

  // Structured primary sources
  const [wikiWeapons, wikiArmor, wikiAttachments, uexShops, uexCommodities] = await Promise.all([
    fetchWikiItems('/items?filter[category]=weapons').catch(e => ({ data: [], error: e.message })),
    fetchWikiItems('/items?filter[category]=armor').catch(e => ({ data: [], error: e.message })),
    fetchWikiItems('/items?filter[category]=weapon-attachments').catch(e => ({ data: [], error: e.message })),
    fetchUex('/shops').catch(e => ({ data: [], error: e.message })),
    fetchUex('/commodities').catch(e => ({ data: [], error: e.message })),
  ]);

  if (wikiWeapons.error) report.warnings.push(`wiki weapons: ${wikiWeapons.error}`);
  if (wikiArmor.error) report.warnings.push(`wiki armor: ${wikiArmor.error}`);
  if (wikiAttachments.error) report.warnings.push(`wiki attachments: ${wikiAttachments.error}`);
  if (uexShops.error) report.warnings.push(`uex shops: ${uexShops.error}`);
  if (uexCommodities.error) report.warnings.push(`uex commodities: ${uexCommodities.error}`);

  const locations = [];
  const vendors = [];

  for (const shop of (uexShops.data || [])) {
    const locName = shop.location_name || shop.station_name || shop.city_name || null;
    const locSlug = locName ? slugify(locName) : null;
    if (locName) {
      locations.push({ id: `location:${locSlug}`, slug: locSlug, name: locName, type: 'location', verificationStatus: 'community_verified', sourceReferences: ['uex'] });
    }
    vendors.push({
      id: `vendor:${slugify(shop.name)}`,
      slug: slugify(shop.name),
      name: shop.name,
      type: 'vendor',
      locationIds: locSlug ? [`location:${locSlug}`] : [],
      verificationStatus: 'community_verified',
      confidenceScore: 0.7,
      sourceReferences: ['uex']
    });
  }

  const weapons = (wikiWeapons.data || []).map(item => normalizeRecord('weapon', item, { verificationStatus: 'community_verified', confidenceScore: 0.8, sourceReferences: ['star-citizen-wiki-api'] }));
  const armor = (wikiArmor.data || []).map(item => normalizeRecord('armor', item, { verificationStatus: 'community_verified', confidenceScore: 0.8, sourceReferences: ['star-citizen-wiki-api'] }));
  const attachments = (wikiAttachments.data || []).map(item => normalizeRecord('attachment', item, { verificationStatus: 'community_verified', confidenceScore: 0.8, sourceReferences: ['star-citizen-wiki-api'] }));

  const resources = (uexCommodities.data || []).filter(c => c.is_extractable || c.is_mineral || c.is_harvestable).map(c => normalizeRecord('resource', {
    name: c.name,
    slug: c.slug,
    category: c.kind || 'resource',
    description: c.wiki || '',
    tags: [c.is_extractable ? 'extractable' : null, c.is_mineral ? 'mineral' : null, c.is_raw ? 'raw' : null, c.is_refined ? 'refined' : null, c.is_harvestable ? 'harvestable' : null, c.is_volatile_qt ? 'volatile-qt' : null, c.is_volatile_time ? 'volatile-time' : null],
    verificationStatus: 'community_verified',
    confidenceScore: 0.75,
    sourceReferences: ['uex']
  }));

  const indexes = {
    weaponClasses: WEAPON_CLASSES,
    armorFamilies: ARMOR_FAMILIES,
    attachmentGroups: ATTACHMENT_GROUPS,
  };

  const uiPayload = {
    meta: {
      generatedAt: new Date().toISOString(),
      notes: [
        'Weapons, armor, and attachment lists are pulled from the Star Citizen Wiki API.',
        'Shop and location records are pulled from UEX and are community-maintained.',
        'Mineable resource records are pulled from UEX commodities and filtered by extractable/mineral/harvestable flags.'
      ]
    },
    indexes,
    locations,
    vendors,
    weapons,
    armor,
    attachments,
    resources,
  };

  await writeJson(path.join(OUT_DIR, 'weapons.json'), weapons);
  await writeJson(path.join(OUT_DIR, 'armor.json'), armor);
  await writeJson(path.join(OUT_DIR, 'attachments.json'), attachments);
  await writeJson(path.join(OUT_DIR, 'resources.json'), resources);
  await writeJson(path.join(OUT_DIR, 'locations.json'), locations);
  await writeJson(path.join(OUT_DIR, 'vendors.json'), vendors);
  await writeJson(path.join(PUBLIC_DIR, 'star-citizen-catalog.json'), uiPayload);
  await writeJson(path.join(REPORTS_DIR, 'catalog-sync-report.json'), report);

  console.log(`Wrote ${weapons.length} weapons, ${armor.length} armor items, ${attachments.length} attachments, ${resources.length} mineable resources.`);
}

main().catch(err => { console.error(err); process.exit(1); });
