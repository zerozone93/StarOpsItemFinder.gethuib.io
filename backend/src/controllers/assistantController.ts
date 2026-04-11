import { Request, Response } from 'express';
import { processQuery } from '../services/assistantService.js';
import { z } from 'zod';

const AssistantQuerySchema = z.object({ query: z.string().min(1).max(500) });

export async function assistant(req: Request, res: Response): Promise<void> {
  const parsed = AssistantQuerySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid request', details: parsed.error.errors }); return; }
  const result = await processQuery(parsed.data.query);
  res.json(result);
}
