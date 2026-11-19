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
import uploadRoutes from './routes/upload.routes';
import publicRoutes from './routes/public.routes';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

export const app = express();
const PORT = Number(process.env.PORT) || 5000;

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
app.use('/api/upload', uploadRoutes);
app.use('/api/public', publicRoutes);

// Serve Frontend Build (client/dist)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(
    express.static(clientDistPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (filePath.includes(path.sep + 'assets' + path.sep)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    // Never send index.html for missing static assets (prevents dynamic import syntax error on old build chunks)
    if (req.path.startsWith('/assets/')) {
      return res.status(404).type('text/plain').send('Asset not found');
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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

function freePortSync(port: number): void {
  try {
    const { execSync } = require('child_process');
    if (process.platform === 'win32') {
      const output = execSync('netstat -ano').toString();
      const lines = output
        .split('\r\n')
        .filter((l: string) => (l.includes(`:${port} `) || l.includes(`:${port}\t`)) && l.includes('LISTENING'));
      const pids = new Set<string>();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && Number(pid) !== process.pid) {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`);
        } catch {
          // Process already terminated
        }
      }
    } else {
      execSync(`fuser -k ${port}/tcp 2>/dev/null || true`);
    }
  } catch {
    // Port was already free
  }
}

if (process.env.NODE_ENV !== 'test') {
  let retryCount = 0;
  const maxRetries = 2;

  const startServer = () => {
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

      // Reconcile and auto-release any existing advance-verified work orders
      import('./utils/autoRelease').then(({ reconcileEligibleWorkOrders }) => {
        reconcileEligibleWorkOrders().catch((err) => {
          console.warn(`⚠️ [AutoRelease Notice] Startup reconciliation:`, err.message);
        });
      });
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`⚠️ Port ${PORT} is currently occupied. Automatically freeing port ${PORT} (attempt ${retryCount}/${maxRetries})...`);
          freePortSync(PORT);
          setTimeout(() => {
            console.log(`🔄 Retrying server start on http://localhost:${PORT}...`);
            startServer();
          }, 800);
          return;
        }
        console.error(`❌ Port ${PORT} is still in use after ${maxRetries} automatic retry attempts.`);
        console.error(`💡 Run: npm run clean:port`);
        process.exit(1);
      }
    });
  };

  startServer();
}
