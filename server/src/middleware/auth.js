import db from '../db/index.js';

export function requireAuth(req, res, next) {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const session = db.prepare(
    'SELECT s.*, t.id as user_id, t.name, t.color, t.role FROM sessions s JOIN team_members t ON s.team_member_id = t.id WHERE s.id = ? AND s.expires_at > datetime(\'now\')'
  ).get(sessionId);

  if (!session) {
    res.clearCookie('session_id');
    return res.status(401).json({ message: 'Session expired' });
  }

  req.user = {
    id: session.user_id,
    name: session.name,
    color: session.color,
    role: session.role,
  };

  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}
