import type { AssistantMessage, AssistantProvider, AssistantResponse } from '../types';

export class RemoteAssistantProvider implements AssistantProvider {
  private endpoint: string;

  constructor(endpoint = '/api/assistant') {
    this.endpoint = endpoint;
  }

  async query(message: string, history: AssistantMessage[]): Promise<AssistantResponse> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) {
      throw new Error(`Remote assistant error: ${res.status}`);
    }
    return res.json() as Promise<AssistantResponse>;
  }
}
