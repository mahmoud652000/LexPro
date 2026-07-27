import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import bcrypt from 'bcryptjs';
import { connectDatabase } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/error';
import routes from './routes';
import { User, ActivityLog } from './models';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || '*';

// Middleware
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.io setup
const server = http.createServer(app);
export const io = new SocketServer(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});

// تتبع المستخدمين النشطين
const onlineUsers = new Map<string, string>(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('📡 عميل متصل:', socket.id);

  // ربط المستخدم بـ socket
  socket.on('userOnline', (userId: string) => {
    onlineUsers.set(userId, socket.id);
    socket.join(userId);
    io.emit('usersUpdate', Array.from(onlineUsers.keys()));
    console.log('✅ المستخدم متصل:', userId);
  });

  socket.on('disconnect', () => {
    // إزالة المستخدم من القائمة
    for (const [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        io.emit('usersUpdate', Array.from(onlineUsers.keys()));
        console.log('📡 المستخدم قطع الاتصال:', uid);
        break;
      }
    }
  });
});

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}

// إنشاء حساب المدير الافتراضي
async function seedAdmin(): Promise<void> {
  const existing = await User.findOne({ username: 'admin' });
  if (!existing) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      name: 'المدير العام',
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      active: true,
    });
    console.log('✅ تم إنشاء حساب المدير الافتراضي (admin / admin123)');
  }
}

// حذف الإشعارات الأقدم من 48 ساعة كل ساعة
async function cleanupOldActivityLogs(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const result = await ActivityLog.deleteMany({ createdAt: { $lt: cutoff } });
    if (result.deletedCount > 0) {
      console.log(`🗑️ تم حذف ${result.deletedCount} إشعار قديم`);
    }
  } catch (err) {
    console.error('خطأ في حذف الإشعارات القديمة:', err);
  }
}

// Start server
async function start(): Promise<void> {
  await connectDatabase();
  await seedAdmin();
  await cleanupOldActivityLogs();
  setInterval(cleanupOldActivityLogs, 60 * 60 * 1000);
  server.listen(PORT, () => {
    console.log(`🚀 خادم LEX PRO يعمل على المنفذ ${PORT}`);
  });
}

start();
