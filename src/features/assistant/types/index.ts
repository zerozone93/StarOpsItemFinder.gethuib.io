export type MessageRole = 'user' | 'assistant' | 'system';

export interface AssistantMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export type IntentType =
  | 'find_resource_location'
  | 'find_vendor'
  | 'mining_requirements'
  | 'crafting_requirements'
  | 'weapon_sources'
  | 'armor_sources'
  | 'location_info'
  | 'general';

export interface Intent {
  type: IntentType;
  entities: string[];
  rawQuery: string;
}

export interface AssistantResponse {
  message: string;
  relatedIds?: string[];
  suggestions?: string[];
}

export interface AssistantProvider {
  query(message: string, history: AssistantMessage[]): Promise<AssistantResponse>;
}
