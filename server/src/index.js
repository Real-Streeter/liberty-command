import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import columnRoutes from './routes/columns.js';
import taskRoutes from './routes/tasks.js';
import rfpRoutes from './routes/rfps.js';
import teamRoutes from './routes/team.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Trust nginx proxy so rate limiter uses real client IPs
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // CSP is handled by nginx in production
}));

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // generous limit for a small team tool
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit on login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts. Please try again later.' },
});

// Body parsing
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/columns', requireAuth, columnRoutes);
app.use('/api/tasks', requireAuth, taskRoutes);
app.use('/api/rfps', requireAuth, rfpRoutes);
app.use('/api/team', requireAuth, teamRoutes);

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(__dirname, '../../dist');
  app.use(express.static(clientDist));
  // SPA fallback — serve index.html for all non-API routes
  app.get('*path', (req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Liberty Command server running on port ${PORT}`);
  console.log(`  CORS origin: ${CORS_ORIGIN}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
});
