export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  relatedLinks?: { label: string; to: string }[];
};
