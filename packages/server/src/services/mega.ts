import { Request, Response } from 'express';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import path from 'path';

// Polyfill: Node.js 18 لا يحتوي على globalThis.crypto
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = require('crypto').webcrypto;
}

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// lazy import لتجنب الاعتماد الدائري مع models
function getFileReference(): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../models').FileReference;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mega: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storage: any = null;

function getMega(): any {
  if (!mega) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mega = require('megajs');
  }
  return mega;
}

export function initMegaStorage(): Promise<void> {
  return new Promise((resolve, reject) => {
    const email = process.env.MEGA_EMAIL;
    const password = process.env.MEGA_PASSWORD;

    if (!email || !password) {
      reject(new Error('MEGA_EMAIL و MEGA_PASSWORD غير محددين في .env'));
      return;
    }

    const m = getMega();
    storage = new m.Storage(
      { email, password, autoload: true },
      (err: Error | null) => {
        if (err) {
          console.error('❌ خطأ في الاتصال بـ Mega:', err.message);
          reject(err);
        } else {
          console.log('✅ Mega متصل:', email);
          resolve();
        }
      },
    );
  });
}

function getStorage(): any {
  if (!storage) {
    throw new Error('Mega storage غير مهيأ. تأكد من استدعاء initMegaStorage()');
  }
  return storage;
}

// إصلاح ترميز اسم الملف (multer يقرأ بـ latin1، نحوّل إلى utf8)
function fixFilename(name: string): string {
  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
}

export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'لم يتم إرسال ملف' });
      return;
    }

    const st = getStorage();
    const fixedName = fixFilename(file.originalname);

    const uploadStream = st.upload({
      name: fixedName,
      size: file.size,
    });

    const readable = Readable.from(file.buffer);
    readable.pipe(uploadStream);

    uploadStream.on('complete', async (fileNode: any) => {
      try {
        const shareUrl = await fileNode.link();
        const nodeId = fileNode.nodeId;

        // حفظ مرجع في MongoDB
        const FileReference = getFileReference();
        const ref = await FileReference.create({
          megaUrl: shareUrl,
          nodeId,
          fileName: fixedName,
          fileSize: fileNode.size || file.size,
        });

        res.json({
          success: true,
          data: {
            fileId: ref._id.toString(),
            fileName: ref.fileName,
            fileSize: ref.fileSize,
            shareUrl,
          },
        });
      } catch {
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'تعذر حفظ مرجع الملف' });
        }
      }
    });

    uploadStream.on('error', (err: Error) => {
      console.error('❌ خطأ في رفع الملف إلى Mega:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'تعذر رفع الملف إلى Mega' });
      }
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

    const m = getMega();
    const megaFile = m.File.fromURL(ref.megaUrl);

    megaFile.loadAttributes((err: Error | null, f: any) => {
      if (err) {
        console.error('❌ خطأ في تحميل بيانات الملف:', err.message);
        res.status(404).json({ success: false, message: 'الملف غير موجود على Mega' });
        return;
      }

      res.setHeader('Content-Type', f.mime || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodeURIComponent(ref.fileName || f.name || 'file')}`,
      );

      const downloadStream = f.download();
      downloadStream.pipe(res);
      downloadStream.on('error', (e: Error) => {
        console.error('❌ خطأ في تحميل الملف:', e.message);
      });
    });
  } catch {
    res.status(404).json({ success: false, message: 'الملف غير موجود' });
  }
}

// البحث عن ملف في شجرة Mega بواسطة nodeId
function findFileByNodeId(st: any, nodeId: string): any {
  if (!st.root || !st.root.children) return null;

  // البحث في المستوى الأول
  for (const child of st.root.children) {
    if (child.nodeId === nodeId) return child;
  }

  // البحث في المجلدات الفرعية
  for (const child of st.root.children) {
    if (child.directory && child.children) {
      for (const subChild of child.children) {
        if (subChild.nodeId === nodeId) return subChild;
      }
    }
  }

  return null;
}

export async function deleteFile(fileId: string): Promise<void> {
  try {
    const FileReference = getFileReference();
    const ref = await FileReference.findById(fileId);
    if (!ref) return;

    const st = getStorage();

    // محاولة الحذف عبر nodeId (الأكثر موثوقية)
    if (ref.nodeId) {
      const fileNode = findFileByNodeId(st, ref.nodeId);
      if (fileNode) {
        await new Promise<void>((resolve, reject) => {
          fileNode.delete((err: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        });
        await FileReference.findByIdAndDelete(fileId);
        return;
      }
    }

    // محاولة بديلة: الحذف عبر URL
    const m = getMega();
    const megaFile = m.File.fromURL(ref.megaUrl);

    await new Promise<void>((resolve, reject) => {
      megaFile.loadAttributes((err: Error | null) => {
        if (err) {
          // الملف قد يكون محذوفاً بالفعل
          resolve();
          return;
        }

        megaFile.delete((delErr: Error | null) => {
          if (delErr) reject(delErr);
          else resolve();
        });
      });
    });

    await FileReference.findByIdAndDelete(fileId);
  } catch (err) {
    // حتى لو فشل الحذف من Mega، احذف المرجع من MongoDB
    try {
      const FileReference = getFileReference();
      await FileReference.findByIdAndDelete(fileId);
    } catch {
      /* ignore */
    }
  }
}
