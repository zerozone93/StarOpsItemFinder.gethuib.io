import { Request, Response } from 'express';
import { importData } from '../services/importService.js';

export async function importJson(req: Request, res: Response): Promise<void> {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  const summary = await importData(data);
  res.json({ success: true, summary });
}
