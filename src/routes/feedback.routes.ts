import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function createFeedbackRouter(pool: Pool): Router {
  const router = Router();

  // GET /api/v1/feedback — list all feedback (public)
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        'SELECT id, name, type, message, created_at FROM feedback ORDER BY created_at DESC LIMIT 100'
      );
      res.json({ feedback: result.rows });
    } catch (error) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ error: 'Failed to fetch feedback' });
    }
  });

  // POST /api/v1/feedback — submit feedback (public, no auth)
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { name, email, type, message } = req.body;

      if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required' });
      }

      const validTypes = ['suggestion', 'bug', 'feature', 'other'];
      const feedbackType = validTypes.includes(type) ? type : 'suggestion';

      const result = await pool.query(
        'INSERT INTO feedback (name, email, type, message) VALUES ($1, $2, $3, $4) RETURNING id, name, type, message, created_at',
        [name.trim(), email?.trim() || null, feedbackType, message.trim()]
      );

      res.status(201).json({ feedback: result.rows[0] });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  });

  // DELETE /api/v1/feedback/:id — delete feedback (admin)
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM feedback WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Feedback not found' });
      }
      res.json({ message: 'Feedback deleted' });
    } catch (error) {
      console.error('Error deleting feedback:', error);
      res.status(500).json({ error: 'Failed to delete feedback' });
    }
  });

  return router;
}
