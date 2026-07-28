const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const exePath = path.join(__dirname, '..', 'dist-electron', 'win-unpacked', 'LEX PRO.exe');
const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');
const rceditExe = path.join(__dirname, '..', 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');

if (!fs.existsSync(exePath)) {
  console.error('❌ لم يتم العثور على LEX PRO.exe في:', exePath);
  process.exit(1);
}

// ============================================
// 1) إنشاء app-update.yml لـ electron-updater
// ============================================
const resourcesDir = path.join(__dirname, '..', 'dist-electron', 'win-unpacked', 'resources');
const updateYmlPath = path.join(resourcesDir, 'app-update.yml');

const updateYmlContent = `provider: github
owner: mahmoud652000
repo: LexPro
releaseType: release
vPrefixedTagName: true
`;

fs.writeFileSync(updateYmlPath, updateYmlContent, 'utf8');
console.log('✅ تم إنشاء app-update.yml');

// ============================================
// 2) تضمين الأيقونة في LEX PRO.exe
// ============================================
console.log('🎯 جاري تضمين الأيقونة في LEX PRO.exe ...');

try {
  execFileSync(rceditExe, [
    exePath,
    '--set-icon', iconPath,
    '--set-version-string', 'ProductName', 'LEX PRO',
    '--set-version-string', 'FileDescription', 'نظام إدارة مكاتب المحاماة - LEX PRO',
    '--set-version-string', 'CompanyName', 'Mahmoud',
  ], { stdio: 'inherit' });

  console.log('✅ تم تضمين الأيقونة بنجاح');
} catch (err) {
  console.error('❌ فشل تضمين الأيقونة:', err.message);
  process.exit(1);
}
