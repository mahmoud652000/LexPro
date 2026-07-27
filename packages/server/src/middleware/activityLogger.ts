import { AuthRequest } from './auth';
import { Response, NextFunction } from 'express';
import { ActivityLog } from '../models';
import { io } from '../index';

const MODULE_MAP: Record<string, string> = {
  'courts': 'المحاكم',
  'case-types': 'أنواع القضايا',
  'announcement-types': 'أنواع الإعلانات',
  'customers': 'العملاء',
  'cases': 'القضايا',
  'sessions': 'الجلسات',
  'case-documents': 'مستندات القضايا',
  'session-documents': 'مستندات الجلسات',
  'announcements': 'الإعلانات',
  'announcement-documents': 'مستندات الإعلانات',
  'customer-documents': 'مستندات العملاء',
  'templates': 'النماذج',
  'fees': 'الأتعاب',
  'fee-payments': 'دفعات الأتعاب',
  'expenses': 'المصروفات',
  'expense-documents': 'مستندات المصروفات',
  'tasks': 'المهام',
  'users': 'المستخدمون',
  'lawyer-profile': 'بيانات المحامي',
  'backup': 'النسخ الاحتياطي',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'إضافة',
  update: 'تعديل',
  delete: 'حذف',
};

export async function activityLogger(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const originalSend = res.send.bind(res);

  res.send = function (body: any): Response {
    // فقط للطلبات الناجحة
    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
    const method = req.method;

    if (isSuccess && ['POST', 'PUT', 'DELETE'].includes(method) && req.user) {
      const urlPath = req.path.split('/').filter(Boolean)[0] || '';
      const moduleLabel = MODULE_MAP[urlPath];

      // تجاهل مسارات المصادقة والملفات
      if (moduleLabel && !urlPath.startsWith('auth') && !urlPath.startsWith('files')) {
        let action: 'create' | 'update' | 'delete' = 'create';
        if (method === 'PUT') action = 'update';
        else if (method === 'DELETE') action = 'delete';

        let detail = '';
        try {
          const parsed = typeof body === 'string' ? JSON.parse(body) : body;
          const data = parsed?.data || parsed;
          if (action === 'create') {
            detail = data?.name || data?.caseNumber || data?.title || data?.announcementNumber || '';
          }
        } catch { /* ignore */ }

        const description = detail
          ? `${ACTION_LABELS[action]} ${moduleLabel}${detail ? `: ${detail}` : ''}`
          : `${ACTION_LABELS[action]} في ${moduleLabel}`;

        ActivityLog.create({
          userId: req.user.id,
          userName: req.user.name,
          action,
          module: urlPath,
          moduleLabel,
          description,
          read: false,
        }).then((log) => {
          io.emit('newActivity', log);
        }).catch(() => { /* ignore */ });
      }
    }

    return originalSend(body);
  } as any;

  next();
}
