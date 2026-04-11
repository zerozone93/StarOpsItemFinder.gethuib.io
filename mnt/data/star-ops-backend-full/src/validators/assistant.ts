import { z } from 'zod';

export const assistantQuestionSchema = z.object({
  question: z.string().min(2),
  mode: z.enum(['local', 'remote']).optional()
});
