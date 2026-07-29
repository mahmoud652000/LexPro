import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI غير محدد في متغيرات البيئة');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI as string, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ MongoDB متصل');
    // Mega يُهيأ في الخلفية من index.ts بعد بدء الخادم
  } catch (error) {
    console.error('❌ خطأ في الاتصال بـ MongoDB:', error);
    throw error;
  }
}
