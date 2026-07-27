import multer from 'multer';

// تخزين الملفات في الذاكرة مؤقتاً قبل رفعها إلى GridFS
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB كحد أقصى
  },
});
