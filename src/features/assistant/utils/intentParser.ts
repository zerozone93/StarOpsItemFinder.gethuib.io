import type { Intent, IntentType } from '../types';

const RESOURCE_KEYWORDS = ['find','where','location','mine','get','source','deposit'];
const VENDOR_KEYWORDS = ['buy','purchase','sell','shop','vendor','store','sold'];
const MINING_KEYWORDS = ['mine','mining','drill','extract','roc','fps','ship mining','prospector','mole'];
const CRAFTING_KEYWORDS = ['craft','recipe','blueprint','make','ingredients','components'];
const WEAPON_KEYWORDS = ['weapon','gun','rifle','pistol','shotgun','sniper','smg'];
const ARMOR_KEYWORDS = ['armor','armour','helmet','torso','legs','arms','undersuit','protection'];
const LOCATION_KEYWORDS = ['location','planet','moon','station','city','where is','tell me about'];

function extractEntities(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const stopWords = new Set(['where','what','how','do','i','find','the','a','an','to','for','is','are','in','at','on','can','buy','get','need']);
  return words.filter((w) => w.length > 2 && !stopWords.has(w));
}

function scoreKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((score, kw) => (lower.includes(kw) ? score + 1 : score), 0);
}

export function parseIntent(query: string): Intent {
  const scores: Record<IntentType, number> = {
    find_resource_location: scoreKeywords(query, RESOURCE_KEYWORDS),
    find_vendor: scoreKeywords(query, VENDOR_KEYWORDS),
    mining_requirements: scoreKeywords(query, MINING_KEYWORDS),
    crafting_requirements: scoreKeywords(query, CRAFTING_KEYWORDS),
    weapon_sources: scoreKeywords(query, WEAPON_KEYWORDS),
    armor_sources: scoreKeywords(query, ARMOR_KEYWORDS),
    location_info: scoreKeywords(query, LOCATION_KEYWORDS),
    general: 0,
  };

  let bestType: IntentType = 'general';
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores) as [IntentType, number][]) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  return {
    type: bestType,
    entities: extractEntities(query),
    rawQuery: query,
  };
}
