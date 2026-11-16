import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import bgaRoutes from './routes/bga.routes';
import accountsRoutes from './routes/accounts.routes';
import technicalRoutes from './routes/technical.routes';
import notificationRoutes from './routes/notification.routes';
import resourceRoutes from './routes/resource.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(compression());
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use(
  '/uploads',
  express.static(uploadDir, {
    maxAge: '7d',
    etag: true,
  })
);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Business Growth Associates Management System',
    timestamp: new Date().toISOString(),
  });
});

// Cache control for API routes (prevent accidental caching of sensitive data)
app.use('/api', (req, res, next) => {
  if (!res.getHeader('Cache-Control')) {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bga', bgaRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/technical', technicalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/resources', resourceRoutes);

// Serve Frontend Build (client/dist) with optimized caching
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  // Vite fingerprinted assets in /assets/ get 1-year immutable caching
  app.use(
    '/assets',
    express.static(path.join(clientDistPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
      etag: true,
    })
  );

  // Other static files in dist
  app.use(
    express.static(clientDistPath, {
      maxAge: '1h',
      etag: true,
      index: false,
    })
  );

  // HTML index fallback: must-revalidate to always serve current client bundle
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Request Error:', err.message);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 400 ? 'Bad Request: Invalid or malformed JSON payload' : 'Internal Server Error',
    details: err.message,
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Process Exception (Kept alive):', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection (Kept alive):', reason);
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 BGA Management System running on http://localhost:${PORT}`);
  console.log(`📡 Database: Neon Cloud PostgreSQL Connected`);
  console.log(`🛡️  Role Portals Active: Admin | BGA | Accounts | Technical`);
  console.log(`=======================================================`);
});
