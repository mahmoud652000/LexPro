import mongoose from 'mongoose';
import { initMegaStorage } from '../services/mega';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI غير محدد في متغيرات البيئة');
  process.exit(1);
}

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI as string, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ MongoDB متصل');

    // Mega اختياري — لا يتعطل الخادم إذا فشل
    try {
      await initMegaStorage();
    } catch (megaErr) {
      console.warn('⚠️ تعذر الاتصال بـ Mega — رفع الملفات لن يعمل:', (megaErr as Error).message);
    }
  } catch (error) {
    console.error('❌ خطأ في الاتصال بـ MongoDB:', error);
    process.exit(1);
  }
}
