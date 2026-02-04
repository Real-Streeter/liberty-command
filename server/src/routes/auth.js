import { Router } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }

    const user = db.prepare('SELECT * FROM team_members WHERE name = ?').get(name);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create session (7 day expiry)
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (id, team_member_id, expires_at) VALUES (?, ?, ?)').run(sessionId, user.id, expiresAt);

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ id: user.id, name: user.name, color: user.color, role: user.role });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const sessionId = req.cookies?.session_id;
  if (sessionId) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }
  res.clearCookie('session_id');
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

export default router;
