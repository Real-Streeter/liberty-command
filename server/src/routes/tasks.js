import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';

const router = Router();

// POST /api/tasks — create a new task
router.post('/', (req, res, next) => {
  try {
    const { content, owner, tag, priority, est, dueDate, columnId } = req.body;
    if (!content) return res.status(400).json({ message: 'Content is required' });

    const targetColumn = columnId || 'col-backlog';
    const id = `task-${Date.now()}`;

    // Get next sort order for the column
    const maxSort = db.prepare('SELECT MAX(sort_order) as max FROM tasks WHERE column_id = ?').get(targetColumn);
    const sortOrder = (maxSort?.max ?? -1) + 1;

    db.prepare(
      'INSERT INTO tasks (id, column_id, content, owner, tag, priority, estimate, due_date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, targetColumn, content, owner || null, tag || null, priority || 'Standard', est || null, dueDate || null, sortOrder);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.status(201).json({
      id: task.id,
      content: task.content,
      owner: task.owner,
      tag: task.tag,
      priority: task.priority,
      est: task.estimate,
      createdAt: task.created_at,
      dueDate: task.due_date,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/reorder — batch reorder tasks (for drag-and-drop)
// Must be before /:id to avoid Express matching "reorder" as an id
router.put('/reorder', (req, res, next) => {
  try {
    const { moves } = req.body;
    if (!Array.isArray(moves)) return res.status(400).json({ message: 'moves array is required' });

    const updateStmt = db.prepare('UPDATE tasks SET column_id = ?, sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?');

    const transaction = db.transaction((moves) => {
      for (const move of moves) {
        updateStmt.run(move.columnId, move.sortOrder, move.taskId);
      }
    });

    transaction(moves);
    res.json({ message: 'Reordered' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id — update a task
router.put('/:id', (req, res, next) => {
  try {
    const { content, owner, tag, priority, est, dueDate } = req.body;
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Task not found' });

    db.prepare(
      'UPDATE tasks SET content = ?, owner = ?, tag = ?, priority = ?, estimate = ?, due_date = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(
      content ?? existing.content,
      owner ?? existing.owner,
      tag ?? existing.tag,
      priority ?? existing.priority,
      est ?? existing.estimate,
      dueDate ?? existing.due_date,
      req.params.id
    );

    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
