import mongoose from 'mongoose';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  Customer, Court, CaseType, AnnouncementType, Case, CaseSession,
  CaseDocument, SessionDocument, CaseAnnouncement, AnnouncementDocument,
  CustomerDocument, DocumentTemplate, FeeAgreement, FeePayment, FeeHistory,
  Expense, ExpenseDocument, LawyerProfile, SystemInfo, Task, User, ActivityLog, Message, FileReference, MODULE_NAMES,
} from '../models';
import { upload } from '../middleware/upload';
import { uploadFile, downloadFile } from '../services/mega';
import { authMiddleware, requireRole, generateToken, AuthRequest, JWT_SECRET } from '../middleware/auth';
import { activityLogger } from '../middleware/activityLogger';
import jwt from 'jsonwebtoken';
import { io, isUserOnline, getOnlineUserIds } from '../index';

const router = Router();

// ============================================
// مسارات المصادقة (Auth Routes)
// ============================================
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
      return;
    }
    const user = await User.findOne({ username });
    if (!user) {
      res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      return;
    }
    if (!user.active) {
      res.status(403).json({ success: false, message: 'هذا الحساب معطّل. تواصل مع المدير' });
      return;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      return;
    }
    const token = generateToken({ id: user._id.toString(), username: user.username, role: user.role, name: user.name });
    res.json({
      success: true,
      data: {
        token,
        user: { id: user._id, name: user.name, username: user.username, role: user.role, permissions: user.permissions },
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.get('/auth/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).select('-password');
    if (!user) { res.status(404).json({ success: false, message: 'المستخدم غير موجود' }); return; }
    res.json({ success: true, data: user });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// تحديث الملف الشخصي (الاسم + الصورة)
router.put('/auth/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, avatar } = req.body;
    const update: any = {};
    if (name) update.name = name;
    if (avatar !== undefined) update.avatar = avatar;
    const user = await User.findByIdAndUpdate(req.user!.id, update, { new: true }).select('-password');
    if (!user) { res.status(404).json({ success: false, message: 'المستخدم غير موجود' }); return; }
    const newToken = generateToken({ id: user._id.toString(), username: user.username, role: user.role, name: user.name });
    res.json({ success: true, data: { user, token: newToken } });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// تغيير كلمة المرور
router.put('/auth/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ success: false, message: 'المستخدم غير موجود' }); return; }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) { res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' }); return; }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'تم تغيير كلمة المرور' });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات المستخدمين (Users) - للمدير فقط
// ============================================
router.get('/users', authMiddleware, requireRole('admin'), async (_req, res) => {
  try {
    const items = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.post('/users', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    const existing = await User.findOne({ username });
    if (existing) { res.status(400).json({ success: false, message: 'اسم المستخدم موجود بالفعل' }); return; }
    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultPermissions = MODULE_NAMES.map(m => ({
      module: m, canView: true, canAdd: false, canEdit: false, canDelete: false,
    }));
    const item = await User.create({ name, username, password: hashedPassword, role, permissions: defaultPermissions, active: true });
    res.json({ success: true, data: { ...item.toObject(), password: undefined } });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.put('/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { name, username, role, active, password } = req.body;
    const update: any = { name, username, role, active };
    if (password) {
      update.password = await bcrypt.hash(password, 10);
    }
    const item = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    res.json({ success: true, data: item });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.put('/users/:id/permissions', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const item = await User.findByIdAndUpdate(
      req.params.id,
      { permissions: req.body.permissions },
      { new: true }
    ).select('-password');
    res.json({ success: true, data: item });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.delete('/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// مسار تحميل الملفات عام (بدون مصادقة) لعرض الصور في <img>
router.get('/files/:id', downloadFile);

// مسار إصدار الخادم (عام بدون مصادقة) لكشف تحديثات الباك إند
router.get('/version', async (_req: Request, res: Response) => {
  try {
    let versionInfo = await SystemInfo.findOne({ key: 'server_version' });
    if (!versionInfo) {
      versionInfo = await SystemInfo.create({ key: 'server_version', value: '1.0.0' });
    }
    res.json({ success: true, data: { version: versionInfo.value, timestamp: Date.now() } });
  } catch {
    res.json({ success: true, data: { version: '1.0.0', timestamp: Date.now() } });
  }
});

// مسار فحص حالة النظام (للتشخيص)
router.get('/debug', (_req: Request, res: Response) => {
  res.json({
    nodeVersion: process.version,
    hasCrypto: typeof (globalThis as any).crypto !== 'undefined',
    hasWebcrypto: typeof (globalThis as any).crypto?.getRandomValues === 'function',
    multerVersion: require('multer/package.json').version,
    megaVersion: require('megajs/package.json').version,
  });
});

// تطبيق المصادقة على جميع المسارات التالية
router.use(authMiddleware);
router.use(activityLogger);

// ============================================
// مسارات الملفات (File Routes)
// ============================================
router.post('/files/upload', upload.single('file'), uploadFile);

// ============================================
// مسارات المحامي (LawyerProfile)
// ============================================
router.get('/lawyer-profile', async (_req: Request, res: Response) => {
  try {
    let profile = await LawyerProfile.findOne();
    if (!profile) {
      profile = await LawyerProfile.create({ name: '', phone: '', address: '' });
    }
    res.json({ success: true, data: profile });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/lawyer-profile', async (req: Request, res: Response) => {
  try {
    let profile = await LawyerProfile.findOne();
    if (!profile) {
      profile = await LawyerProfile.create(req.body);
    } else {
      Object.assign(profile, req.body);
      await profile.save();
    }
    res.json({ success: true, data: profile });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات المحاكم (Courts)
// ============================================
router.get('/courts', async (_req, res) => {
  try { const items = await Court.find().sort({ name: 1 }); res.json({ success: true, data: items }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/courts', async (req, res) => {
  try { const item = await Court.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/courts/:id', async (req, res) => {
  try { const item = await Court.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/courts/:id', async (req, res) => {
  try { await Court.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات أنواع القضايا (CaseTypes)
// ============================================
router.get('/case-types', async (_req, res) => {
  try { const items = await CaseType.find().sort({ name: 1 }); res.json({ success: true, data: items }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/case-types', async (req, res) => {
  try { const item = await CaseType.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/case-types/:id', async (req, res) => {
  try { const item = await CaseType.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/case-types/:id', async (req, res) => {
  try { await CaseType.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات أنواع الإعلانات (AnnouncementTypes)
// ============================================
router.get('/announcement-types', async (_req, res) => {
  try { const items = await AnnouncementType.find().sort({ name: 1 }); res.json({ success: true, data: items }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/announcement-types', async (req, res) => {
  try { const item = await AnnouncementType.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/announcement-types/:id', async (req, res) => {
  try { const item = await AnnouncementType.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/announcement-types/:id', async (req, res) => {
  try { await AnnouncementType.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات العملاء (Customers)
// ============================================
router.get('/customers', async (_req, res) => {
  try { const items = await Customer.find().sort({ createdAt: -1 }); res.json({ success: true, data: items }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.get('/customers/:id', async (req, res) => {
  try {
    const item = await Customer.findById(req.params.id);
    if (!item) { res.status(404).json({ success: false, message: 'العميل غير موجود' }); return; }
    res.json({ success: true, data: item });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/customers', async (req, res) => {
  try { const item = await Customer.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/customers/:id', async (req, res) => {
  try { const item = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/customers/:id', async (req, res) => {
  try {
    const item = await Customer.findById(req.params.id);
    if (item) { await item.deleteOne(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات القضايا (Cases)
// ============================================
router.get('/cases', async (_req, res) => {
  try {
    const items = await Case.find()
      .populate('customerId', 'name')
      .populate('courtId', 'name')
      .populate('caseTypeId', 'name')
      .sort({ createdDate: -1 });
    const result = items.map(c => ({
      ...c.toObject(),
      customerName: (c.customerId as any)?.name,
      courtName: (c.courtId as any)?.name,
      caseTypeName: (c.caseTypeId as any)?.name,
    }));
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.get('/cases/:id', async (req, res) => {
  try {
    const item = await Case.findById(req.params.id)
      .populate('customerId', 'name phone')
      .populate('courtId', 'name')
      .populate('caseTypeId', 'name');
    if (!item) { res.status(404).json({ success: false, message: 'القضية غير موجودة' }); return; }
    res.json({ success: true, data: item });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/cases', async (req, res) => {
  try { const item = await Case.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/cases/:id', async (req, res) => {
  try { const item = await Case.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/cases/:id', async (req, res) => {
  try {
    const item = await Case.findById(req.params.id);
    if (item) { await item.deleteOne(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات الجلسات (CaseSessions)
// ============================================
router.get('/sessions', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.caseId) filter.caseId = req.query.caseId;

    let items = await CaseSession.find(filter)
      .populate({
        path: 'caseId',
        select: 'caseNumber caseYear customerId',
        populate: { path: 'customerId', select: 'name' },
      })
      .populate('courtId', 'name')
      .sort({ sessionDate: 1 });

    let result = items.map(s => ({
      ...s.toObject(),
      caseNumber: (s.caseId as any)?.caseNumber,
      caseYear: (s.caseId as any)?.caseYear,
      customerName: (s.caseId as any)?.customerId?.name || '',
      courtName: (s.courtId as any)?.name,
    }));

    // فلترة الجلسات القادمة
    if (req.query.upcoming === 'true') {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(s => s.sessionDate >= today);
    }

    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.get('/sessions/:id', async (req, res) => {
  try {
    const item = await CaseSession.findById(req.params.id)
      .populate('caseId')
      .populate('courtId', 'name');
    if (!item) { res.status(404).json({ success: false, message: 'الجلسة غير موجودة' }); return; }
    res.json({ success: true, data: item });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/sessions', async (req, res) => {
  try { const item = await CaseSession.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/sessions/:id', async (req, res) => {
  try { const item = await CaseSession.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/sessions/:id', async (req, res) => {
  try {
    const item = await CaseSession.findById(req.params.id);
    if (item) { await item.deleteOne(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات مستندات القضية (CaseDocuments)
// ============================================
router.get('/case-documents', async (_req, res) => {
  try { const items = await CaseDocument.find().sort({ createdDate: -1 }); res.json({ success: true, data: items }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.get('/case-documents/:caseId', async (req, res) => {
  try { const items = await CaseDocument.find({ caseId: req.params.caseId }).sort({ createdDate: -1 }); res.json({ success: true, data: items }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/case-documents', async (req, res) => {
  try { const item = await CaseDocument.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/case-documents/:id', async (req, res) => {
  try {
    const item = await CaseDocument.findById(req.params.id);
    if (item) { await item.deleteOne(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات مستندات الجلسة (SessionDocuments)
// ============================================
router.get('/session-documents/:sessionId', async (req, res) => {
  try { const items = await SessionDocument.find({ caseSessionId: req.params.sessionId }).sort({ createdDate: -1 }); res.json({ success: true, data: items }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/session-documents', async (req, res) => {
  try { const item = await SessionDocument.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/session-documents/:id', async (req, res) => {
  try {
    const item = await SessionDocument.findById(req.params.id);
    if (item) { await item.deleteOne(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات الإعلانات (CaseAnnouncements)
// ============================================
router.get('/announcements', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.caseId) filter.caseId = req.query.caseId;
    const items = await CaseAnnouncement.find(filter)
      .populate('caseId', 'caseNumber caseYear')
      .populate('courtId', 'name')
      .populate('announcementTypeId', 'name')
      .sort({ createdAt: -1 });
    const result = items.map(a => ({
      ...a.toObject(),
      caseNumber: (a.caseId as any)?.caseNumber,
      caseYear: (a.caseId as any)?.caseYear,
      courtName: (a.courtId as any)?.name,
      announcementTypeName: (a.announcementTypeId as any)?.name,
    }));
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.get('/announcements/:id', async (req, res) => {
  try {
    const item = await CaseAnnouncement.findById(req.params.id)
      .populate('caseId')
      .populate('courtId', 'name')
      .populate('announcementTypeId', 'name');
    if (!item) { res.status(404).json({ success: false, message: 'الإعلان غير موجود' }); return; }
    res.json({ success: true, data: item });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/announcements', async (req, res) => {
  try { const item = await CaseAnnouncement.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/announcements/:id', async (req, res) => {
  try { const item = await CaseAnnouncement.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/announcements/:id', async (req, res) => {
  try {
    const item = await CaseAnnouncement.findById(req.params.id);
    if (item) { await item.deleteOne(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات مستندات الإعلان (AnnouncementDocuments)
// ============================================
router.get('/announcement-documents/:announcementId', async (req, res) => {
  try { const items = await AnnouncementDocument.find({ caseAnnouncementId: req.params.announcementId }).sort({ createdDate: -1 }); res.json({ success: true, data: items }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/announcement-documents', async (req, res) => {
  try { const item = await AnnouncementDocument.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/announcement-documents/:id', async (req, res) => {
  try {
    const item = await AnnouncementDocument.findById(req.params.id);
    if (item) { await item.deleteOne(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات مستندات العميل (CustomerDocuments)
// ============================================
router.get('/customer-documents/:customerId', async (req, res) => {
  try { const items = await CustomerDocument.find({ customerId: req.params.customerId }).sort({ createdDate: -1 }); res.json({ success: true, data: items }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/customer-documents', async (req, res) => {
  try { const item = await CustomerDocument.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/customer-documents/:id', async (req, res) => {
  try {
    const item = await CustomerDocument.findById(req.params.id);
    if (item) { await item.deleteOne(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات قوالب المستندات (DocumentTemplates)
// ============================================
router.get('/templates', async (_req, res) => {
  try { const items = await DocumentTemplate.find().sort({ createdDate: -1 }); res.json({ success: true, data: items }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/templates', async (req, res) => {
  try { const item = await DocumentTemplate.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/templates/:id', async (req, res) => {
  try { const item = await DocumentTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/templates/:id', async (req, res) => {
  try {
    const item = await DocumentTemplate.findById(req.params.id);
    if (item) { await item.deleteOne(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات اتفاقيات الرسوم (FeeAgreements)
// ============================================
router.get('/fees', async (_req, res) => {
  try {
    const items = await FeeAgreement.find()
      .populate('customerId', 'name')
      .populate('caseId', 'caseNumber caseYear')
      .sort({ agreementDate: -1 });
    const result = [];
    for (const f of items) {
      const payments = await FeePayment.find({ feeAgreementId: f._id });
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      const totalAmount = parseFloat(f.totalAmount || '0');
      result.push({
        ...f.toObject(),
        customerName: (f.customerId as any)?.name,
        caseNumber: (f.caseId as any)?.caseNumber,
        paidAmount: totalPaid.toFixed(2),
        remainingAmount: (totalAmount - totalPaid).toFixed(2),
      });
    }
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.get('/fees/:id', async (req, res) => {
  try {
    const item = await FeeAgreement.findById(req.params.id)
      .populate('customerId', 'name')
      .populate('caseId', 'caseNumber caseYear');
    if (!item) { res.status(404).json({ success: false, message: 'الاتفاقية غير موجودة' }); return; }
    const payments = await FeePayment.find({ feeAgreementId: item._id }).sort({ paymentDate: -1 });
    const history = await FeeHistory.find({ feeAgreementId: item._id }).sort({ changedAt: -1 });
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    const totalAmount = parseFloat(item.totalAmount || '0');
    res.json({
      success: true,
      data: {
        ...item.toObject(),
        customerName: (item.customerId as any)?.name,
        caseNumber: (item.caseId as any)?.caseNumber,
        paidAmount: totalPaid.toFixed(2),
        remainingAmount: (totalAmount - totalPaid).toFixed(2),
        payments,
        history,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/fees', async (req, res) => {
  try { const item = await FeeAgreement.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/fees/:id', async (req, res) => {
  try {
    const old = await FeeAgreement.findById(req.params.id);
    if (!old) { res.status(404).json({ success: false, message: 'الاتفاقية غير موجودة' }); return; }

    // إذا تغير المبلغ الإجمالي، سجل التغيير
    if (req.body.totalAmount && req.body.totalAmount !== old.totalAmount) {
      await FeeHistory.create({
        feeAgreementId: old._id,
        oldTotalFee: old.totalAmount,
        newTotalFee: req.body.totalAmount,
        reason: req.body.reason || 'تعديل المبلغ',
        changedBy: req.body.changedBy || 'المحامي',
        changedAt: new Date().toISOString(),
      });
    }

    const item = await FeeAgreement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: item });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/fees/:id', async (req, res) => {
  try {
    const item = await FeeAgreement.findById(req.params.id);
    if (item) { await item.deleteOne(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات دفعات الرسوم (FeePayments)
// ============================================
router.get('/fee-payments/:feeAgreementId', async (req, res) => {
  try { const items = await FeePayment.find({ feeAgreementId: req.params.feeAgreementId }).sort({ paymentDate: -1 }); res.json({ success: true, data: items }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/fee-payments', async (req, res) => {
  try { const item = await FeePayment.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/fee-payments/:id', async (req, res) => {
  try { await FeePayment.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات المصاريف (Expenses)
// ============================================
router.get('/expenses', async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.caseId) filter.caseId = req.query.caseId;
    if (req.query.customerId) filter.customerId = req.query.customerId;
    const items = await Expense.find(filter)
      .populate('customerId', 'name')
      .populate('caseId', 'caseNumber caseYear')
      .sort({ expenseDate: -1 });
    const result = items.map(e => ({
      ...e.toObject(),
      customerName: (e.customerId as any)?.name,
      caseNumber: (e.caseId as any)?.caseNumber,
    }));
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/expenses', async (req, res) => {
  try { const item = await Expense.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/expenses/:id', async (req, res) => {
  try { const item = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/expenses/:id', async (req, res) => {
  try {
    const item = await Expense.findById(req.params.id);
    if (item) { await item.deleteOne(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات مستندات المصروف (ExpenseDocuments)
// ============================================
router.get('/expense-documents/:expenseId', async (req, res) => {
  try { const items = await ExpenseDocument.find({ expenseId: req.params.expenseId }).sort({ addedDate: -1 }); res.json({ success: true, data: items }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/expense-documents', async (req, res) => {
  try { const item = await ExpenseDocument.create(req.body); res.json({ success: true, data: item }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/expense-documents/:id', async (req, res) => {
  try {
    const item = await ExpenseDocument.findById(req.params.id);
    if (item) { await item.deleteOne(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات لوحة التحكم (Dashboard)
// ============================================
router.get('/dashboard', async (_req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments();
    const totalCases = await Case.countDocuments();

    // الجلسات القادمة
    const today = new Date().toISOString().split('T')[0];
    const upcomingSessions = await CaseSession.find({ sessionDate: { $gte: today } }).countDocuments();

    // الرسوم
    const feeAgreements = await FeeAgreement.find();
    const allPayments = await FeePayment.find();
    const totalFees = feeAgreements.reduce((sum, f) => sum + parseFloat(f.totalAmount || '0'), 0);
    const collectedFees = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

    // المصاريف
    const expenses = await Expense.find();
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

    res.json({
      success: true,
      data: {
        totalCustomers,
        totalCases,
        activeCases: totalCases,
        upcomingSessions,
        totalFees: totalFees.toFixed(2),
        collectedFees: collectedFees.toFixed(2),
        remainingFees: (totalFees - collectedFees).toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات إعدادات النظام (SystemInfo)
// ============================================
router.get('/system-info/:key', async (req, res) => {
  try { const item = await SystemInfo.findOne({ key: req.params.key }); res.json({ success: true, data: item?.value || null }); }
  catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/system-info/:key', async (req, res) => {
  try {
    const item = await SystemInfo.findOneAndUpdate(
      { key: req.params.key },
      { key: req.params.key, value: req.body.value },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: item });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسار بيانات الموكل الشامل (Customer Dossier)
// ============================================
router.get('/customers/:id/dossier', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) { res.status(404).json({ success: false, message: 'العميل غير موجود' }); return; }

    // القضايا
    const cases = await Case.find({ customerId: req.params.id })
      .populate('courtId', 'name')
      .populate('caseTypeId', 'name')
      .sort({ createdDate: -1 });
    const casesResult = cases.map(c => ({
      ...c.toObject(),
      customerName: customer.name,
      courtName: (c.courtId as any)?.name,
      caseTypeName: (c.caseTypeId as any)?.name,
    }));

    const caseIds = cases.map(c => c._id);

    // الجلسات
    const sessions = await CaseSession.find({ caseId: { $in: caseIds } })
      .populate('caseId', 'caseNumber caseYear')
      .populate('courtId', 'name')
      .sort({ sessionDate: 1 });
    const sessionsResult = sessions.map(s => ({
      ...s.toObject(),
      caseNumber: (s.caseId as any)?.caseNumber,
      courtName: (s.courtId as any)?.name,
    }));

    // الإعلانات
    const announcements = await CaseAnnouncement.find({ caseId: { $in: caseIds } })
      .populate('caseId', 'caseNumber caseYear')
      .populate('courtId', 'name')
      .populate('announcementTypeId', 'name')
      .sort({ createdAt: -1 });
    const announcementsResult = announcements.map(a => ({
      ...a.toObject(),
      caseNumber: (a.caseId as any)?.caseNumber,
      courtName: (a.courtId as any)?.name,
      announcementTypeName: (a.announcementTypeId as any)?.name,
    }));

    // اتفاقيات الرسوم
    const feeAgreements = await FeeAgreement.find({ customerId: req.params.id })
      .populate('caseId', 'caseNumber caseYear')
      .sort({ agreementDate: -1 });
    const feesResult: any[] = [];
    let totalFees = 0;
    let paidFees = 0;
    for (const f of feeAgreements) {
      const payments = await FeePayment.find({ feeAgreementId: f._id });
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      const totalAmount = parseFloat(f.totalAmount || '0');
      totalFees += totalAmount;
      paidFees += totalPaid;
      feesResult.push({
        ...f.toObject(),
        customerName: customer.name,
        caseNumber: (f.caseId as any)?.caseNumber,
        paidAmount: totalPaid.toFixed(2),
        remainingAmount: (totalAmount - totalPaid).toFixed(2),
      });
    }

    // المصاريف
    const expenses = await Expense.find({ customerId: req.params.id })
      .populate('caseId', 'caseNumber caseYear')
      .sort({ expenseDate: -1 });
    const expensesResult = expenses.map(e => ({
      ...e.toObject(),
      customerName: customer.name,
      caseNumber: (e.caseId as any)?.caseNumber,
    }));
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

    // المستندات
    const documents = await CustomerDocument.find({ customerId: req.params.id })
      .sort({ createdDate: -1 });

    res.json({
      success: true,
      data: {
        customer,
        cases: casesResult,
        sessions: sessionsResult,
        announcements: announcementsResult,
        feeAgreements: feesResult,
        expenses: expensesResult,
        documents,
        stats: {
          totalCases: cases.length,
          totalSessions: sessions.length,
          totalAnnouncements: announcements.length,
          totalFees: totalFees.toFixed(2),
          paidFees: paidFees.toFixed(2),
          remainingFees: (totalFees - paidFees).toFixed(2),
          totalExpenses: totalExpenses.toFixed(2),
        },
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسار بيانات المحكمة الشاملة (Court Dossier)
// ============================================
router.get('/courts/:id/dossier', async (req, res) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) { res.status(404).json({ success: false, message: 'المحكمة غير موجودة' }); return; }

    const cases = await Case.find({ courtId: req.params.id })
      .populate('customerId', 'name')
      .populate('caseTypeId', 'name')
      .sort({ createdDate: -1 });
    const casesResult = cases.map(c => ({
      ...c.toObject(),
      customerName: (c.customerId as any)?.name,
      courtName: court.name,
      caseTypeName: (c.caseTypeId as any)?.name,
    }));

    const sessions = await CaseSession.find({ courtId: req.params.id })
      .populate('caseId', 'caseNumber caseYear')
      .sort({ sessionDate: 1 });
    const sessionsResult = sessions.map(s => ({
      ...s.toObject(),
      caseNumber: (s.caseId as any)?.caseNumber,
      courtName: court.name,
    }));

    const announcements = await CaseAnnouncement.find({ courtId: req.params.id })
      .populate('caseId', 'caseNumber caseYear')
      .populate('announcementTypeId', 'name')
      .sort({ createdAt: -1 });
    const announcementsResult = announcements.map(a => ({
      ...a.toObject(),
      caseNumber: (a.caseId as any)?.caseNumber,
      courtName: court.name,
      announcementTypeName: (a.announcementTypeId as any)?.name,
    }));

    const today = new Date().toISOString().split('T')[0];
    const upcomingSessions = sessionsResult.filter(s => s.sessionDate >= today).length;

    res.json({
      success: true,
      data: {
        court,
        cases: casesResult,
        sessions: sessionsResult,
        announcements: announcementsResult,
        stats: {
          totalCases: cases.length,
          totalSessions: sessions.length,
          totalAnnouncements: announcements.length,
          upcomingSessions,
        },
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسار التنبيهات (Notifications)
// ============================================
router.get('/notifications', async (_req, res) => {
  try {
    const notifications: any[] = [];
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // حذف التنبيهات التي فات موعدها
    await CaseSession.deleteMany({
      sessionDate: { $lt: today },
      nextSessionDate: { $lt: today },
    });
    await CaseAnnouncement.deleteMany({
      sessionDate: { $lt: today, $ne: '' },
    });
    await Task.deleteMany({
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $lt: today, $ne: '' },
    });

    // دالة حساب الأيام المتبقية
    const calcDaysLeft = (dateStr: string): number => {
      const cleanDate = dateStr.split(' - ')[0].trim();
      if (!cleanDate) return Infinity;
      return Math.ceil((new Date(cleanDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };

    // دالة تحديد الأولوية: اليوم أو غداً = عاجل، 2-4 أيام = متوسط، 5-10 أيام = منخفض، أكثر من 10 أيام = لا يعرض
    const getUrgency = (daysLeft: number): 'high' | 'medium' | 'low' | null => {
      if (daysLeft < 0) return null;
      if (daysLeft <= 1) return 'high';
      if (daysLeft <= 4) return 'medium';
      if (daysLeft <= 10) return 'low';
      return null;
    };

    // 1. الجلسات القادمة (إظهار تاريخ الجلسة القادمة لكل قضية)
    const sessions = await CaseSession.find({
      $or: [
        { nextSessionDate: { $gte: today, $ne: '' } },
        { sessionDate: { $gte: today } },
      ],
    })
      .populate({
        path: 'caseId',
        select: 'caseNumber caseYear customerId',
        populate: { path: 'customerId', select: 'name' },
      })
      .populate('courtId', 'name')
      .sort({ nextSessionDate: 1, sessionDate: 1 });

    for (const s of sessions) {
      const caseId = (s.caseId as any)?._id?.toString();

      // استخدام تاريخ الجلسة القادمة إذا وُجد وفي المستقبل، وإلا تاريخ الجلسة الحالية
      const nextDateStr = s.nextSessionDate ? s.nextSessionDate.split(' - ')[0].trim() : '';
      const sessionDateStr = s.sessionDate ? s.sessionDate.split(' - ')[0].trim() : '';
      const useNext = nextDateStr && nextDateStr >= today;
      const dateStr = useNext ? nextDateStr : (sessionDateStr >= today ? sessionDateStr : '');
      if (!dateStr) continue;

      const daysLeft = calcDaysLeft(dateStr);
      const urgency = getUrgency(daysLeft);
      if (!urgency) continue;

      const displayDate = useNext ? s.nextSessionDate : s.sessionDate;
      const customerName = (s.caseId as any)?.customerId?.name || '';

      notifications.push({
        id: s._id.toString(),
        type: 'session',
        title: `جلسة محكمة - ${(s.caseId as any)?.caseNumber || ''}`,
        description: s.subject || '',
        date: displayDate,
        caseNumber: (s.caseId as any)?.caseNumber,
        courtName: (s.courtId as any)?.name,
        customerName,
        daysLeft,
        urgency,
      });
    }

    // 2. الإعلانات ذات الجلسات القادمة
    const announcements = await CaseAnnouncement.find({
      sessionDate: { $gte: today, $ne: '' },
    })
      .populate({
        path: 'caseId',
        select: 'caseNumber caseYear customerId',
        populate: { path: 'customerId', select: 'name' },
      })
      .populate('courtId', 'name')
      .populate('announcementTypeId', 'name')
      .sort({ sessionDate: 1 });

    for (const a of announcements) {
      const aDateStr = a.sessionDate ? a.sessionDate.split(' - ')[0].trim() : '';
      if (!aDateStr) continue;

      const daysLeft = calcDaysLeft(aDateStr);
      const urgency = getUrgency(daysLeft);
      if (!urgency) continue;

      const customerName = (a.caseId as any)?.customerId?.name || '';
      const announcementTypeName = (a.announcementTypeId as any)?.name || '';

      notifications.push({
        id: a._id.toString(),
        type: 'announcement',
        title: `إعلان ${announcementTypeName} رقم ${a.announcementNumber} - ${(a.caseId as any)?.caseNumber || ''}`,
        description: a.subject || '',
        date: a.sessionDate || '',
        caseNumber: (a.caseId as any)?.caseNumber,
        courtName: (a.courtId as any)?.name,
        customerName,
        recipientName: a.recipientName || '',
        bailiffName: a.bailiffName || '',
        announcementNumber: a.announcementNumber || '',
        announcementTypeName,
        deliveryDate: a.deliveryDate || '',
        receiptDate: a.receiptDate || '',
        daysLeft,
        urgency,
      });
    }

    // 3. المهام القادمة غير المكتملة
    const tasks = await Task.find({
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $gte: today, $ne: '' },
    })
      .populate('customerId', 'name')
      .populate('caseId', 'caseNumber caseYear')
      .sort({ dueDate: 1 });

    for (const t of tasks) {
      const tDateStr = t.dueDate ? t.dueDate.split(' - ')[0].trim() : '';
      if (!tDateStr) continue;

      const daysLeft = calcDaysLeft(tDateStr);
      const urgency = getUrgency(daysLeft);
      if (!urgency) continue;

      notifications.push({
        id: t._id.toString(),
        type: 'task',
        title: `مهمة - ${t.title}`,
        description: t.description || '',
        date: t.dueDate,
        caseNumber: (t.caseId as any)?.caseNumber,
        daysLeft,
        urgency,
      });
    }

    // ترتيب التنبيهات: حسب اسم المحكمة أولاً ثم التاريخ
    notifications.sort((a, b) => {
      const courtA = a.courtName || '';
      const courtB = b.courtName || '';
      if (courtA !== courtB) return courtA.localeCompare(courtB, 'ar');
      const dateA = a.date ? a.date.split(' - ')[0] : '';
      const dateB = b.date ? b.date.split(' - ')[0] : '';
      return dateA.localeCompare(dateB);
    });

    res.json({ success: true, data: notifications });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسار إعدادات النسخ الاحتياطي (Backup Settings)
// ============================================
router.get('/backup/settings', async (_req, res) => {
  try {
    const item = await SystemInfo.findOne({ key: 'backup_settings' });
    const settings = item?.value ? JSON.parse(item.value) : {
      autoBackupEnabled: false,
      backupFolder: '',
    };
    res.json({ success: true, data: settings });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/backup/settings', async (req, res) => {
  try {
    const settingsValue = JSON.stringify(req.body);
    await SystemInfo.findOneAndUpdate(
      { key: 'backup_settings' },
      { key: 'backup_settings', value: settingsValue },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: req.body });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسار إنشاء نسخة احتياطية (Backup Create)
// ============================================
router.post('/backup/create', async (_req, res) => {
  try {
    const db = mongoose.connection.db!;
    const collections = await db.collections();
    const backup: Record<string, any> = {};
    for (const collection of collections) {
      const name = collection.collectionName;
      if (name.startsWith('system.')) continue;
      const docs = await collection.find({}).toArray();
      backup[name] = docs;
    }
    const backupData = JSON.stringify({
      version: '1.0',
      date: new Date().toISOString(),
      data: backup,
    }, null, 2);

    const fileName = `lexpro-backup-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(backupData);
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسار استعادة نسخة احتياطية (Backup Restore)
// ============================================
router.post('/backup/restore', async (req, res) => {
  try {
    const backupData = req.body;
    const data = backupData.data || backupData;
    const db = mongoose.connection.db!;
    for (const [collectionName, docs] of Object.entries(data)) {
      if (collectionName.startsWith('system.')) continue;
      const collection = db.collection(collectionName);
      await collection.deleteMany({});
      if (Array.isArray(docs) && docs.length > 0) {
        const processedDocs = (docs as any[]).map(doc => {
          if (doc._id && typeof doc._id === 'string' && mongoose.Types.ObjectId.isValid(doc._id)) {
            doc._id = new mongoose.Types.ObjectId(doc._id);
          }
          return doc;
        });
        await collection.insertMany(processedDocs);
      }
    }
    res.json({ success: true, message: 'تم استعادة النسخة الاحتياطية بنجاح' });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات المهام (Tasks)
// ============================================
router.get('/tasks', async (_req, res) => {
  try {
    const items = await Task.find()
      .populate('customerId', 'name')
      .populate('caseId', 'caseNumber caseYear')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.post('/tasks', async (req, res) => {
  try {
    const item = await Task.create(req.body);
    res.json({ success: true, data: item });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.put('/tasks/:id', async (req, res) => {
  try {
    const item = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: item });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});
router.delete('/tasks/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات سجل النشاط (Activity Logs)
// ============================================
router.get('/activity-logs', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const items = await ActivityLog.find({ createdAt: { $gte: cutoff } }).sort({ createdAt: -1 }).limit(limit);
    const unreadCount = await ActivityLog.countDocuments({ read: false, createdAt: { $gte: cutoff } });
    res.json({ success: true, data: items, unreadCount });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

router.put('/activity-logs/read', async (req: AuthRequest, res: Response) => {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await ActivityLog.updateMany({ read: false, createdAt: { $gte: cutoff } }, { read: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// ============================================
// مسارات الدردشة (Chat Messages)
// ============================================

// قائمة المستخدمين النشطين
router.get('/auth/online-users', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({ active: true }).select('_id name username role avatar');
    const result = users.map(u => ({
      ...u.toObject(),
      online: isUserOnline(u._id.toString()),
    }));
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// قائمة المحادثات (آخر رسالة مع كل مستخدم)
router.get('/messages/conversations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversations = await Message.aggregate([
      { $match: { $or: [{ senderId: new mongoose.Types.ObjectId(userId) }, { receiverId: new mongoose.Types.ObjectId(userId) }] } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: { $cond: [{ $eq: ['$senderId', new mongoose.Types.ObjectId(userId)] }, '$receiverId', '$senderId'] }, lastMessage: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$lastMessage' } },
      { $sort: { createdAt: -1 } },
    ]);
    res.json({ success: true, data: conversations });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// سجل الرسائل مع مستخدم محدد
router.get('/messages/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const myId = req.user!.id;
    const otherId = req.params.userId;
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 }).limit(100);

    // تعليم رسائل المستلم كمقروءة
    await Message.updateMany({ senderId: otherId, receiverId: myId, read: false }, { read: true });

    res.json({ success: true, data: messages });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

// إرسال رسالة
router.post('/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, text } = req.body;
    const msg = await Message.create({
      senderId: req.user!.id,
      senderName: req.user!.name,
      receiverId,
      text,
      read: false,
    });

    // إرسال عبر socket.io للمستلم
    const populated = await Message.findById(msg._id);
    io.to(receiverId).emit('newMessage', populated);

    res.json({ success: true, data: populated });
  } catch (err) { res.status(500).json({ success: false, message: (err as Error).message }); }
});

export default router;
