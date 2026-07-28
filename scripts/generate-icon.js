const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const sourcePng = path.join(__dirname, '..', 'packages', 'renderer', 'public', 'favicon.png');
const outputDir = path.join(__dirname, '..', 'build');
const outputFile = path.join(outputDir, 'icon.ico');

const sizes = [16, 24, 32, 48, 64, 128, 256];

(async () => {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pngs = await Promise.all(
      sizes.map(size =>
        sharp(sourcePng)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );

    const ico = await toIco(pngs);
    fs.writeFileSync(outputFile, ico);

    console.log('✅ تم إنشاء icon.ico بنجاح في:', outputFile);
  } catch (err) {
    console.error('❌ فشل إنشاء الأيقونة:', err);
    process.exit(1);
  }
})();
