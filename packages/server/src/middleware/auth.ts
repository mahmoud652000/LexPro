import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET غير محدد في متغيرات البيئة');
  process.exit(1);
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    name: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'غير مصرح بالوصول' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as any;
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role, name: decoded.name };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'رمز الدخول غير صالح' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'لا تملك صلاحية لهذا الإجراء' });
      return;
    }
    next();
  };
}

export function generateToken(user: { id: string; username: string; role: string; name: string }): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET as string,
    { expiresIn: '7d' }
  );
}

export { JWT_SECRET };
