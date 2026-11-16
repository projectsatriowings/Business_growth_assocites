import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, BgaStatus } from '@prisma/client';
import { prisma } from '../prisma';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: BgaStatus;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'bga_super_secret_jwt_key_2026_growth_portal_secure_auth';

export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    // Check if user still exists in database and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    if (user.role === Role.BGA && user.status === BgaStatus.SUSPENDED) {
      res.status(403).json({ error: 'Your BGA account is currently suspended. Please contact Admin.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session token' });
  }
};

export const authorizeRoles = (...allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
      });
      return;
    }

    next();
  };
};

export const checkBgaActive = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role === Role.BGA && req.user.status !== BgaStatus.ACTIVE) {
    res.status(403).json({
      error: `Your BGA registration is currently in status '${req.user.status}'. Portal operations are enabled only after company approval.`,
      currentStatus: req.user.status,
    });
    return;
  }

  next();
};

export const logAudit = async (
  userId: string | undefined,
  userEmail: string | undefined,
  userRole: string | undefined,
  action: string,
  entityType: string,
  entityId?: string,
  details?: any,
  ipAddress?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userEmail: userEmail || null,
        userRole: userRole || null,
        action,
        entityType,
        entityId: entityId || null,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        ipAddress: ipAddress || null,
      },
    });
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
};

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED' = 'INFO',
  link?: string
) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
      },
    });
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
};
