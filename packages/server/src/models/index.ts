import mongoose from 'mongoose';
import { deleteFile } from '../services/mega';

// ============================================
// نموذج المحامي (LawyerProfile)
// ============================================
const lawyerProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
});

export const LawyerProfile = mongoose.model('LawyerProfile', lawyerProfileSchema);

// ============================================
// نموذج المحكمة (Court)
// ============================================
const courtSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

export const Court = mongoose.model('Court', courtSchema);

// ============================================
// نموذج نوع القضية (CaseType)
// ============================================
const caseTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

export const CaseType = mongoose.model('CaseType', caseTypeSchema);

// ============================================
// نموذج نوع الإعلان (AnnouncementType)
// ============================================
const announcementTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

export const AnnouncementType = mongoose.model('AnnouncementType', announcementTypeSchema);

// ============================================
// نموذج العميل (Customer)
// ============================================
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  identityNumber: { type: String, default: '' },
  whatsappNumber: { type: String, default: '' },
  email: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

customerSchema.index({ name: 1 });
customerSchema.index({ phone: 1 });

// Cascade delete: حذف العميل يحذف قضاياه واتفاقيات الرسوم والمصاريف ومستنداته
customerSchema.pre('deleteOne', { document: true, query: false }, async function () {
  const customerId = this._id;
  const cases = await Case.find({ customerId });
  for (const c of cases) {
    await c.deleteOne();
  }
  await FeeAgreement.deleteMany({ customerId });
  await Expense.deleteMany({ customerId });
  await CustomerDocument.deleteMany({ customerId });
});

export const Customer = mongoose.model('Customer', customerSchema);

// ============================================
// نموذج القضية (Case)
// ============================================
const caseSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  opponentName: { type: String, required: true },
  clientCapacity: { type: String, required: true },
  opponentCapacity: { type: String, required: true },
  courtId: { type: mongoose.Schema.Types.ObjectId, ref: 'Court', required: true },
  circuitNumber: { type: String, required: true },
  caseNumber: { type: String, required: true },
  caseYear: { type: Number, required: true },
  caseTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseType', required: true },
  caseSubject: { type: String, required: true },
  createdDate: { type: Date, default: Date.now },
});

caseSchema.index({ customerId: 1 });
caseSchema.index({ courtId: 1 });
caseSchema.index({ caseTypeId: 1 });
caseSchema.index({ createdDate: -1 });

// Cascade delete: حذف القضية يحذف الجلسات والمستندات والإعلانات والرسوم والمصاريف
caseSchema.pre('deleteOne', { document: true, query: false }, async function () {
  const caseId = this._id;
  const sessions = await CaseSession.find({ caseId });
  for (const s of sessions) {
    await s.deleteOne();
  }
  const announcements = await CaseAnnouncement.find({ caseId });
  for (const a of announcements) {
    await a.deleteOne();
  }
  await CaseDocument.deleteMany({ caseId });
  await FeeAgreement.updateMany({ caseId }, { $unset: { caseId: '' } });
  await Expense.updateMany({ caseId }, { $unset: { caseId: '' } });
});

export const Case = mongoose.model('Case', caseSchema);

// ============================================
// نموذج جلسة المحكمة (CaseSession)
// ============================================
const caseSessionSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  sessionNumber: { type: Number, required: true },
  sessionDate: { type: String, required: true },
  courtId: { type: mongoose.Schema.Types.ObjectId, ref: 'Court', required: true },
  rollNumber: { type: String, required: true },
  hallNumber: { type: String, required: true },
  subject: { type: String, required: true },
  sessionType: { type: String, required: true },
  sessionDecision: { type: String, required: true },
  nextSessionDate: { type: String, default: '' },
  notes: { type: String, required: true },
});

caseSessionSchema.index({ caseId: 1 });
caseSessionSchema.index({ courtId: 1 });
caseSessionSchema.index({ sessionDate: 1 });

// Cascade delete مستندات الجلسة
caseSessionSchema.pre('deleteOne', { document: true, query: false }, async function () {
  await SessionDocument.deleteMany({ caseSessionId: this._id });
});

export const CaseSession = mongoose.model('CaseSession', caseSessionSchema);

// ============================================
// نموذج مستند القضية (CaseDocument)
// ============================================
const caseDocumentSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  documentName: { type: String, required: true },
  documentType: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fileName: { type: String, required: true },
  notes: { type: String, required: true },
  createdDate: { type: Date, default: Date.now },
});

caseDocumentSchema.pre('deleteOne', { document: true, query: false }, async function () {
  try {
    await deleteFile(this.fileId.toString());
  } catch { /* الملف قد يكون محذوفاً بالفعل */ }
});

export const CaseDocument = mongoose.model('CaseDocument', caseDocumentSchema);

// ============================================
// نموذج مستند الجلسة (SessionDocument)
// ============================================
const sessionDocumentSchema = new mongoose.Schema({
  caseSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseSession', required: true },
  documentName: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fileName: { type: String, required: true },
  documentType: { type: String, default: '' },
  createdDate: { type: Date, default: Date.now },
});

sessionDocumentSchema.pre('deleteOne', { document: true, query: false }, async function () {
  try {
    await deleteFile(this.fileId.toString());
  } catch { /* الملف قد يكون محذوفاً بالفعل */ }
});

export const SessionDocument = mongoose.model('SessionDocument', sessionDocumentSchema);

// ============================================
// نموذج الإعلان القانوني (CaseAnnouncement)
// ============================================
const caseAnnouncementSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
  announcementNumber: { type: String, required: true },
  courtId: { type: mongoose.Schema.Types.ObjectId, ref: 'Court', required: true },
  announcementTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnnouncementType', required: true },
  recipientName: { type: String, required: true },
  recipientAddress: { type: String, required: true },
  subject: { type: String, required: true },
  documentType: { type: String, default: '' },
  bailiffName: { type: String, required: true },
  deliveryDate: { type: String, default: '' },
  receiptDate: { type: String, default: '' },
  sessionDate: { type: String, default: '' },
  notes: { type: String, default: '' },
});

caseAnnouncementSchema.index({ caseId: 1 });
caseAnnouncementSchema.index({ courtId: 1 });
caseAnnouncementSchema.index({ createdAt: -1 });

caseAnnouncementSchema.pre('deleteOne', { document: true, query: false }, async function () {
  await AnnouncementDocument.deleteMany({ caseAnnouncementId: this._id });
});

export const CaseAnnouncement = mongoose.model('CaseAnnouncement', caseAnnouncementSchema);

// ============================================
// نموذج مستند الإعلان (AnnouncementDocument)
// ============================================
const announcementDocumentSchema = new mongoose.Schema({
  caseAnnouncementId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaseAnnouncement', required: true },
  documentName: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fileName: { type: String, required: true },
  documentType: { type: String, default: '' },
  createdDate: { type: Date, default: Date.now },
});

announcementDocumentSchema.pre('deleteOne', { document: true, query: false }, async function () {
  try {
    await deleteFile(this.fileId.toString());
  } catch { /* الملف قد يكون محذوفاً بالفعل */ }
});

export const AnnouncementDocument = mongoose.model('AnnouncementDocument', announcementDocumentSchema);

// ============================================
// نموذج مستند العميل (CustomerDocument)
// ============================================
const customerDocumentSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  documentName: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fileName: { type: String, required: true },
  documentType: { type: String, default: '' },
  createdDate: { type: Date, default: Date.now },
});

customerDocumentSchema.pre('deleteOne', { document: true, query: false }, async function () {
  try {
    await deleteFile(this.fileId.toString());
  } catch { /* الملف قد يكون محذوفاً بالفعل */ }
});

export const CustomerDocument = mongoose.model('CustomerDocument', customerDocumentSchema);

// ============================================
// نموذج قالب المستند (DocumentTemplate)
// ============================================
const documentTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, default: '' },
  documentType: { type: String, default: '' },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fileName: { type: String, required: true },
  notes: { type: String, default: '' },
  createdDate: { type: Date, default: Date.now },
});

documentTemplateSchema.pre('deleteOne', { document: true, query: false }, async function () {
  try {
    await deleteFile(this.fileId.toString());
  } catch { /* الملف قد يكون محذوفاً بالفعل */ }
});

export const DocumentTemplate = mongoose.model('DocumentTemplate', documentTemplateSchema);

// ============================================
// نموذج اتفاقية الرسوم (FeeAgreement)
// ============================================
const feeAgreementSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', default: null },
  totalAmount: { type: String, required: true },
  agreementDate: { type: String, required: true },
  notes: { type: String, required: true },
});

feeAgreementSchema.index({ customerId: 1 });
feeAgreementSchema.index({ caseId: 1 });

feeAgreementSchema.pre('deleteOne', { document: true, query: false }, async function () {
  await FeePayment.deleteMany({ feeAgreementId: this._id });
  await FeeHistory.deleteMany({ feeAgreementId: this._id });
});

export const FeeAgreement = mongoose.model('FeeAgreement', feeAgreementSchema);

// ============================================
// نموذج دفعة الرسوم (FeePayment)
// ============================================
const feePaymentSchema = new mongoose.Schema({
  feeAgreementId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeAgreement', required: true },
  amount: { type: String, required: true },
  paymentDate: { type: String, required: true },
  notes: { type: String, required: true },
});

feePaymentSchema.index({ feeAgreementId: 1 });

export const FeePayment = mongoose.model('FeePayment', feePaymentSchema);

// ============================================
// نموذج سجل تعديل الرسوم (FeeHistory)
// ============================================
const feeHistorySchema = new mongoose.Schema({
  feeAgreementId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeAgreement', required: true },
  oldTotalFee: { type: String, required: true },
  newTotalFee: { type: String, required: true },
  reason: { type: String, required: true },
  changedBy: { type: String, required: true },
  changedAt: { type: String, required: true },
});

export const FeeHistory = mongoose.model('FeeHistory', feeHistorySchema);

// ============================================
// نموذج المصروف (Expense)
// ============================================
const expenseSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', default: null },
  amount: { type: String, required: true },
  expenseDate: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
});

expenseSchema.index({ customerId: 1 });
expenseSchema.index({ caseId: 1 });

expenseSchema.pre('deleteOne', { document: true, query: false }, async function () {
  const docs = await ExpenseDocument.find({ expenseId: this._id });
  for (const d of docs) {
    await d.deleteOne();
  }
});

export const Expense = mongoose.model('Expense', expenseSchema);

// ============================================
// نموذج مستند المصروف (ExpenseDocument)
// ============================================
const expenseDocumentSchema = new mongoose.Schema({
  expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fileName: { type: String, required: true },
  addedDate: { type: Date, default: Date.now },
});

expenseDocumentSchema.pre('deleteOne', { document: true, query: false }, async function () {
  try {
    await deleteFile(this.fileId.toString());
  } catch { /* الملف قد يكون محذوفاً بالفعل */ }
});

export const ExpenseDocument = mongoose.model('ExpenseDocument', expenseDocumentSchema);

// ============================================
// نموذج إعدادات النظام (SystemInfo)
// ============================================
const systemInfoSchema = new mongoose.Schema({
  key: { type: String, required: true },
  value: { type: String, required: true },
});

export const SystemInfo = mongoose.model('SystemInfo', systemInfoSchema);

// ============================================
// نموذج المهمة (Task)
// ============================================
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  dueDate: { type: String, default: '' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', default: null },
}, { timestamps: true });

taskSchema.index({ customerId: 1 });
taskSchema.index({ caseId: 1 });
taskSchema.index({ createdAt: -1 });

export const Task = mongoose.model('Task', taskSchema);

// ============================================
// نموذج المستخدم (User) - نظام المصادقة
// ============================================
const MODULE_NAMES = [
  'dashboard', 'customers', 'cases', 'sessions', 'announcements',
  'tasks', 'fees', 'expenses', 'templates', 'notifications', 'settings', 'backup', 'users',
] as const;

const permissionSchema = new mongoose.Schema({
  module: { type: String, enum: MODULE_NAMES, required: true },
  canView: { type: Boolean, default: true },
  canAdd: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'lawyer', 'secretary'], default: 'secretary' },
  permissions: [permissionSchema],
  active: { type: Boolean, default: true },
  avatar: { type: String, default: '' },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);

// ============================================
// نموذج سجل النشاط (ActivityLog)
// ============================================
const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName: { type: String, default: 'النظام' },
  action: { type: String, enum: ['create', 'update', 'delete'], required: true },
  module: { type: String, required: true },
  moduleLabel: { type: String, required: true },
  description: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

activityLogSchema.index({ createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// ============================================
// نموذج الرسائل (Message) - نظام الدردشة
// ============================================
const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, read: 1 });

export const Message = mongoose.model('Message', messageSchema);

// ============================================
// نموذج مرجع الملف (FileReference) - يربط معرف قصير برابط Mega
// ============================================
const fileReferenceSchema = new mongoose.Schema({
  megaUrl: { type: String, required: true },
  nodeId: { type: String, default: '' },
  fileName: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
}, { timestamps: true });

export const FileReference = mongoose.model('FileReference', fileReferenceSchema);

export { MODULE_NAMES };