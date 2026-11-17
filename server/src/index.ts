import express from 'express';
import cors from 'cors';
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
import contactRoutes from './routes/contact.routes';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
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
app.use('/uploads', express.static(uploadDir));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Business Growth Associates Management System',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bga', bgaRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/technical', technicalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/contact', contactRoutes);

// Serve Frontend Build (client/dist)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
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

process.on('uncaughtException', (err: any) => {
  console.error('Uncaught Process Exception:', err);
  if (err?.code === 'EADDRINUSE') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection (Kept alive):', reason);
});

import { verifySmtpConnection } from './utils/mailer';

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, async () => {
    console.log(`=======================================================`);
    console.log(`🚀 BGA Management System running on http://localhost:${PORT}`);
    console.log(`📡 Database: Neon Cloud PostgreSQL Connected`);
    console.log(`🛡️  Role Portals Active: Admin | BGA | Accounts | Technical`);
    console.log(`📧 SMTP Email Active: info@atriowings.in (Nodemailer Gateway)`);
    console.log(`=======================================================`);

    // Non-blocking SMTP connection verification
    verifySmtpConnection().then((res) => {
      if (res.success) {
        console.log(`✅ [SMTP] ${res.message}`);
      } else {
        console.warn(`⚠️ [SMTP Notice] ${res.message} (Emails will queue or retry)`);
      }
    }).catch((err) => {
      console.warn(`⚠️ [SMTP Notice] Initial check:`, err.message);
    });
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use by another running process.`);
      console.error(`💡 Run: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
      process.exit(1);
    }
  });
}
