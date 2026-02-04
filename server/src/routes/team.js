import { Router } from 'express';
import bcrypt from 'bcrypt';
import db from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 10;

// GET /api/team — all team members (no password hashes)
router.get('/', (req, res, next) => {
  try {
    const members = db.prepare('SELECT id, name, color, role, created_at FROM team_members ORDER BY created_at').all();
    res.json(members);
  } catch (err) {
    next(err);
  }
});

// POST /api/team — add team member (admin only)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, color, password, role } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const id = `user-${Date.now()}`;
    const passwordHash = await bcrypt.hash(password || 'liberty', SALT_ROUNDS);

    db.prepare(
      'INSERT INTO team_members (id, name, color, password_hash, role) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name, color || 'blue', passwordHash, role || 'member');

    res.status(201).json({ id, name, color: color || 'blue', role: role || 'member' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/team/:id — update team member
router.put('/:id', async (req, res, next) => {
  try {
    const { name, color, password } = req.body;
    const existing = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Member not found' });

    if (password) {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      db.prepare('UPDATE team_members SET name = ?, color = ?, password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(name ?? existing.name, color ?? existing.color, passwordHash, req.params.id);
    } else {
      db.prepare('UPDATE team_members SET name = ?, color = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(name ?? existing.name, color ?? existing.color, req.params.id);
    }

    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/team/:id — delete team member (admin only)
router.delete('/:id', requireAdmin, (req, res, next) => {
  try {
    // Don't allow deleting yourself
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    const result = db.prepare('DELETE FROM team_members WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ message: 'Member not found' });
    // Clean up their sessions
    db.prepare('DELETE FROM sessions WHERE team_member_id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
