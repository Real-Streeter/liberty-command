export function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);

  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({ message: 'A record with that identifier already exists.' });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
}
