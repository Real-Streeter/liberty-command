import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// GET /api/rfps
router.get('/', (req, res, next) => {
  try {
    const rfps = db.prepare('SELECT * FROM rfps ORDER BY created_at').all();
    res.json(rfps.map(r => ({
      id: r.id,
      name: r.name,
      carrier: r.carrier,
      progress: r.progress,
      status: r.status,
      dueDate: r.due_date,
      notes: r.notes || '',
    })));
  } catch (err) {
    next(err);
  }
});

// POST /api/rfps
router.post('/', (req, res, next) => {
  try {
    const { name, carrier, progress, status, dueDate, notes } = req.body;
    if (!name || !carrier) return res.status(400).json({ message: 'Name and carrier are required' });

    const id = `rfp-${Date.now()}`;
    db.prepare(
      'INSERT INTO rfps (id, name, carrier, progress, status, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, name, carrier, progress || 0, status || 'Request Sent', dueDate || null, notes || '');

    const rfp = db.prepare('SELECT * FROM rfps WHERE id = ?').get(id);
    res.status(201).json({
      id: rfp.id,
      name: rfp.name,
      carrier: rfp.carrier,
      progress: rfp.progress,
      status: rfp.status,
      dueDate: rfp.due_date,
      notes: rfp.notes || '',
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/rfps/:id
router.put('/:id', (req, res, next) => {
  try {
    const { name, carrier, progress, status, dueDate, notes } = req.body;
    const existing = db.prepare('SELECT * FROM rfps WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ message: 'RFP not found' });

    db.prepare(
      'UPDATE rfps SET name = ?, carrier = ?, progress = ?, status = ?, due_date = ?, notes = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(
      name ?? existing.name,
      carrier ?? existing.carrier,
      progress ?? existing.progress,
      status ?? existing.status,
      dueDate ?? existing.due_date,
      notes ?? existing.notes,
      req.params.id
    );

    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rfps/:id
router.delete('/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM rfps WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ message: 'RFP not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
