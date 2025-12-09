import { Router, Response } from 'express';
import { db } from '../config/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

export const profileRouter = Router();

// All routes require authentication
profileRouter.use(authenticate);

// Get current user's profile
profileRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const stmt = db.prepare(
      'SELECT id, cognito_sub, email, birthday, created_at, updated_at FROM users WHERE cognito_sub = ?'
    );
    const row = stmt.get(req.user!.sub);

    if (!row) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(row);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Create or update profile (upsert)
profileRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { birthday } = req.body;

    const stmt = db.prepare(`
      INSERT INTO users (cognito_sub, email, birthday)
      VALUES (?, ?, ?)
      ON CONFLICT (cognito_sub)
      DO UPDATE SET 
        email = excluded.email, 
        birthday = COALESCE(excluded.birthday, users.birthday), 
        updated_at = datetime('now')
      RETURNING id, cognito_sub, email, birthday, created_at, updated_at
    `);
    
    const row = stmt.get(req.user!.sub, req.user!.email, birthday || null);
    res.json(row);
  } catch (error) {
    console.error('Error creating/updating profile:', error);
    res.status(500).json({ error: 'Failed to create/update profile' });
  }
});

// Update birthday
profileRouter.put('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { birthday } = req.body;

    if (!birthday) {
      return res.status(400).json({ error: 'Birthday is required' });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthday)) {
      return res.status(400).json({ error: 'Birthday must be in YYYY-MM-DD format' });
    }

    const stmt = db.prepare(`
      UPDATE users 
      SET birthday = ?, updated_at = datetime('now')
      WHERE cognito_sub = ?
      RETURNING id, cognito_sub, email, birthday, created_at, updated_at
    `);
    
    const row = stmt.get(birthday, req.user!.sub);

    if (!row) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(row);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});
