import type { StarCitizenData } from '../../../types';
import type { AssistantMessage, AssistantProvider, AssistantResponse } from '../types';
import { parseIntent } from '../utils/intentParser';
import { buildAnswer } from '../utils/answerTemplates';

export class LocalAssistantProvider implements AssistantProvider {
  private data: StarCitizenData;

  constructor(data: StarCitizenData) {
    this.data = data;
  }

  async query(message: string, _history: AssistantMessage[]): Promise<AssistantResponse> {
    const intent = parseIntent(message);
    return buildAnswer(intent, this.data);
  }
}
