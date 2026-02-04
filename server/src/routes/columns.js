import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// GET /api/columns — returns all columns with their tasks
router.get('/', (req, res, next) => {
  try {
    const columns = db.prepare('SELECT * FROM columns ORDER BY sort_order').all();
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY sort_order').all();

    const result = columns.map(col => ({
      id: col.id,
      title: col.title,
      icon: col.icon,
      color: col.color,
      tasks: tasks
        .filter(t => t.column_id === col.id)
        .map(t => ({
          id: t.id,
          content: t.content,
          owner: t.owner,
          tag: t.tag,
          priority: t.priority,
          est: t.estimate,
          createdAt: t.created_at,
          dueDate: t.due_date,
        })),
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
