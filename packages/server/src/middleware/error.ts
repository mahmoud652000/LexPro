import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error('❌ خطأ:', err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'خطأ داخلي في الخادم',
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: 'المسار غير موجود',
  });
}
