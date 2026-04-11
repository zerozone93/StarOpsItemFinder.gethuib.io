import { AssistantResponse, Intent, SearchResult } from '../types/index.js';
import { globalSearch } from './searchService.js';

function detectIntent(query: string): Intent {
  const q = query.toLowerCase().trim();
  const greetings = ['hi', 'hello', 'hey', 'greetings', 'howdy', 'sup'];
  if (greetings.some(g => q === g || q.startsWith(g + ' '))) return 'greeting';

  const locationWords = ['where', 'location', 'find', 'located', 'planet', 'moon', 'station'];
  if (locationWords.some(w => q.includes(w))) return 'location_query';

  const priceWords = ['price', 'cost', 'buy', 'sell', 'aUEC', 'value', 'worth', 'cheap', 'expensive'];
  if (priceWords.some(w => q.includes(w))) return 'price_query';

  const itemWords = ['what is', 'tell me about', 'info on', 'details', 'weapon', 'armor', 'resource', 'recipe'];
  if (itemWords.some(w => q.includes(w))) return 'item_query';

  if (q.length > 2) return 'item_query';
  return 'unsupported';
}

function formatAnswer(intent: Intent, query: string, results: SearchResult[]): { answer: string; confidence: number } {
  if (intent === 'greeting') {
    return {
      answer: `👋 Hello! I'm the Star Ops assistant. Ask me about weapons, armor, resources, locations, recipes, or vendors in the Star Citizen universe. What would you like to know?`,
      confidence: 1.0,
    };
  }

  if (results.length === 0) {
    return {
      answer: `I couldn't find any information about "${query}". Try searching for specific item names, locations, or resource types.`,
      confidence: 0.1,
    };
  }

  const top = results.slice(0, 3);
  const topResult = top[0];

  if (intent === 'location_query') {
    const locations = results.filter(r => r.type === 'location');
    if (locations.length > 0) {
      const locNames = locations.slice(0, 3).map(l => `**${l.name}**`).join(', ');
      return {
        answer: `📍 Regarding "${query}":\n\nFound these locations: ${locNames}.\n\n${locations[0].snippet}`,
        confidence: 0.8,
      };
    }
  }

  if (intent === 'price_query') {
    const items = results.filter(r => r.type === 'weapon' || r.type === 'armor' || r.type === 'resource');
    if (items.length > 0) {
      const item = items[0];
      return {
        answer: `💰 Price info for "${query}":\n\n**${item.name}** (${item.type}): ${item.snippet}\n\nFor exact pricing, check the vendors or market listings.`,
        confidence: 0.6,
      };
    }
  }

  const typeEmoji: Record<string, string> = { resource: '⛏️', weapon: '🔫', armor: '🛡️', vendor: '🏪', location: '📍', recipe: '🔧' };
  const emoji = typeEmoji[topResult.type] ?? '📋';
  const listItems = top.map(r => `- ${typeEmoji[r.type] ?? '•'} **${r.name}** (${r.type}): ${r.snippet}`).join('\n');

  return {
    answer: `${emoji} Results for "${query}":\n\n${listItems}`,
    confidence: Math.min(0.9, topResult.score / 100),
  };
}

export async function processQuery(query: string): Promise<AssistantResponse> {
  const intent = detectIntent(query);

  if (intent === 'greeting') {
    return { answer: formatAnswer(intent, query, []).answer, sources: [], confidence: 1.0, intent };
  }

  if (intent === 'unsupported') {
    return {
      answer: `I'm not sure how to help with that. Try asking about specific Star Citizen items, locations, weapons, armor, or resources.`,
      sources: [],
      confidence: 0.0,
      intent,
    };
  }

  const searchResult = await globalSearch(query, 1, 5);
  const { answer, confidence } = formatAnswer(intent, query, searchResult.data);

  return { answer, sources: searchResult.data, confidence, intent };
}
