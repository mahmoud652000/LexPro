import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: 'LEX PRO - نظام إدارة مكاتب المحاماة',
    icon: path.join(__dirname, '..', '..', '..', 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      zoomFactor: 0.95,
      plugins: true,
    },
  });

  // في وضع التطوير، حمّل من Vite dev server
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.webContents.openDevTools();
  });

  // فتح الروابط الخارجية في المتصفح، السماح بروابط الملفات المحلية
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    if (url.includes('/api/files/')) {
      return { action: 'allow' as const };
    }
    shell.openExternal(url);
    return { action: 'deny' as const };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================
// تصدير PDF وحفظه مباشرة على الجهاز
// ============================================
ipcMain.handle('save-pdf', async (event, html: string, fileName: string) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false, message: 'لا توجد نافذة نشطة' };

    // إنشاء نافذة مخفية لعرض الـ HTML وتحويله إلى PDF
    const pdfWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    // انتظار تحميل المحتوى بالكامل
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfBuffer = await pdfWin.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: false,
      margins: { marginType: 'custom', top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
    });

    pdfWin.close();

    // فتح نافذة حفظ الملف
    const result = await dialog.showSaveDialog(win, {
      title: 'حفظ ملف PDF',
      defaultPath: fileName,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, message: 'تم إلغاء الحفظ' };
    }

    fs.writeFileSync(result.filePath, pdfBuffer);

    return { success: true, message: result.filePath };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
});

// ============================================
// طباعة مع إظهار نافذة إعدادات الطباعة
// ============================================
ipcMain.handle('print-document', async (event, html: string) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false, message: 'لا توجد نافذة نشطة' };

    const printWin = new BrowserWindow({
      show: true,
      width: 900,
      height: 700,
      title: 'معاينة الطباعة',
      parent: win,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    await new Promise(resolve => setTimeout(resolve, 500));

    printWin.focus();

    await printWin.webContents.print({ silent: false, printBackground: true });

    printWin.close();

    return { success: true, message: 'تمت الطباعة' };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
});

// ============================================
// فتح ملف في نافذة مستقلة للمعاينة
// ============================================
ipcMain.handle('open-file', async (event, url: string, title: string) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false, message: 'لا توجد نافذة نشطة' };

    const previewWin = new BrowserWindow({
      width: 1000,
      height: 800,
      show: false,
      title: title || 'معاينة المستند',
      parent: win,
      modal: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        plugins: true,
      },
    });

    // انتظار تحميل الصفحة بالكامل قبل إظهار النافذة
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('انتهت مهلة تحميل الملف'));
      }, 30000);

      previewWin.webContents.once('did-finish-load', () => {
        clearTimeout(timer);
        resolve();
      });

      previewWin.webContents.once('did-fail-load', (_e: any, errorCode: number, errorDesc: string) => {
        clearTimeout(timer);
        reject(new Error(`فشل تحميل الملف: ${errorDesc || errorCode}`));
      });

      previewWin.loadURL(url);
    });

    previewWin.show();
    previewWin.focus();

    return { success: true, message: 'تم الفتح' };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
});

// ============================================
// طباعة ملف من رابط مع إظهار نافذة الطباعة
// ============================================
ipcMain.handle('print-file', async (event, url: string) => {
  let printWin: BrowserWindow | null = null;
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false, message: 'لا توجد نافذة نشطة' };

    printWin = new BrowserWindow({
      show: false,
      parent: win,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        plugins: true,
      },
    });

    // انتظار تحميل الملف بالكامل قبل الطباعة
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('انتهت مهلة تحميل الملف للطباعة'));
      }, 30000);

      printWin!.webContents.once('did-finish-load', () => {
        clearTimeout(timer);
        resolve();
      });

      printWin!.webContents.once('did-fail-load', (_e: any, errorCode: number, errorDesc: string) => {
        clearTimeout(timer);
        reject(new Error(`فشل تحميل الملف: ${errorDesc || errorCode}`));
      });

      printWin!.loadURL(url);
    });

    // تأخير بسيط لضمان عرض المحتوى
    await new Promise(resolve => setTimeout(resolve, 500));

    printWin.focus();

    await printWin.webContents.print({ silent: false, printBackground: true });

    printWin.close();
    printWin = null;

    return { success: true, message: 'تمت الطباعة' };
  } catch (err) {
    if (printWin) {
      try { printWin.close(); } catch { /* ignore */ }
    }
    return { success: false, message: (err as Error).message };
  }
});

// ============================================
// التحديث التلقائي (Auto Updater)
// ============================================
function initAutoUpdater(): void {
  if (!app.isPackaged) {
    console.log('[autoUpdater] وضع التطوير - يتم تخطي التحديث التلقائي');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update-status', { event: 'checking-for-update' });
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-status', {
      event: 'update-available',
      version: info.version,
    });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-status', { event: 'update-not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-status', {
      event: 'download-progress',
      percent: progress.percent,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-status', {
      event: 'update-downloaded',
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-status', {
      event: 'error',
      message: err?.message ?? String(err),
    });
  });

  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, updateAvailable: !!result?.updateInfo };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[autoUpdater] فشل الفحص:', err);
    });
  }, 3000);
}

app.whenReady().then(() => {
  createWindow();
  initAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
