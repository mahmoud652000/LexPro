import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

// مجلد رفع الملفات على السيرفر
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

function getFileReference(): any {
  return require('../models').FileReference;
}

// تهيئة مجلد التخزين المحلي
export function initStorage(): Promise<void> {
  return new Promise((resolve) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    console.log('✅ مجلد التخزين المحلي جاهز:', UPLOADS_DIR);
    resolve();
  });
}

// إصلاح ترميز اسم الملف
function fixFilename(name: string): string {
  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
}

// الحصول على امتداد الملف
function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? '.' + parts.pop() : '';
}

export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'لم يتم إرسال ملف' });
      return;
    }

    const fixedName = fixFilename(file.originalname);
    const ext = getExtension(fixedName);
    const storedFilename = crypto.randomUUID() + ext;
    const filePath = path.join(UPLOADS_DIR, storedFilename);

    // حفظ الملف على القرص
    fs.writeFileSync(filePath, file.buffer);

    // حفظ مرجع في MongoDB
    const FileReference = getFileReference();
    const ref = await FileReference.create({
      filePath: storedFilename,
      fileName: fixedName,
      fileSize: file.size,
    });

    res.json({
      success: true,
      data: {
        fileId: ref._id.toString(),
        fileName: ref.fileName,
        fileSize: ref.fileSize,
      },
    });
  } catch (err) {
    console.error('❌ خطأ في رفع الملف:', (err as Error).message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'تعذر رفع الملف: ' + (err as Error).message });
    }
  }
}

export async function downloadFile(req: Request, res: Response): Promise<void> {
  const fileId = req.params.id;
  if (!fileId) {
    res.status(400).json({ success: false, message: 'معرف الملف مطلوب' });
    return;
  }

  try {
    const FileReference = getFileReference();
    const ref = await FileReference.findById(fileId);
    if (!ref) {
      res.status(404).json({ success: false, message: 'الملف غير موجود' });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, ref.filePath);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: 'الملف غير موجود على القرص' });
      return;
    }

    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(ref.fileName)}`);
    res.setHeader('Content-Length', ref.fileSize.toString());

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', (err) => {
      console.error('❌ خطأ في قراءة الملف:', err.message);
    });
  } catch {
    res.status(404).json({ success: false, message: 'الملف غير موجود' });
  }
}

export async function deleteFile(fileId: string): Promise<void> {
  try {
    const FileReference = getFileReference();
    const ref = await FileReference.findById(fileId);
    if (!ref) return;

    // حذف الملف من القرص
    if (ref.filePath) {
      const filePath = path.join(UPLOADS_DIR, ref.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await FileReference.findByIdAndDelete(fileId);
  } catch (err) {
    // حتى لو فشل الحذف من القرص، احذف المرجع من MongoDB
    try {
      const FileReference = getFileReference();
      await FileReference.findByIdAndDelete(fileId);
    } catch { /* ignore */ }
  }
}
