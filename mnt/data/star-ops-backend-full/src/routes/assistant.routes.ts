import type { FastifyInstance } from 'fastify';
import { assistantQuestionSchema } from '../validators/assistant.js';
import { answerQuestion } from '../services/assistant.service.js';

export async function assistantRoutes(app: FastifyInstance) {
  app.post('/assistant', async (request) => {
    const body = assistantQuestionSchema.parse(request.body);
    return answerQuestion(body.question);
  });
}
