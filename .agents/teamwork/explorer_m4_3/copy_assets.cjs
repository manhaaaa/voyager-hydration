/**
 * Asset Integration Utility for Android Capacitor
 * Maps public/assets/character/voyager_base.png to all Android mipmap and splash drawables.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const SOURCE_IMAGE = path.join(ROOT, 'public/assets/character/voyager_base.png');
const RES_DIR = path.join(ROOT, 'android/app/src/main/res');

if (!fs.existsSync(SOURCE_IMAGE)) {
  console.error(`Source image not found: ${SOURCE_IMAGE}`);
  process.exit(1);
}

if (!fs.existsSync(RES_DIR)) {
  console.error(`Android res directory not found: ${RES_DIR}. Run npx cap add android first.`);
  process.exit(1);
}

const sourceBuffer = fs.readFileSync(SOURCE_IMAGE);

// Target mipmap directories for launcher icons
const mipmapDirs = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi',
];

const iconNames = [
  'ic_launcher.png',
  'ic_launcher_round.png',
  'ic_launcher_foreground.png',
];

for (const dir of mipmapDirs) {
  const targetDir = path.join(RES_DIR, dir);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  for (const icon of iconNames) {
    const dest = path.join(targetDir, icon);
    fs.writeFileSync(dest, sourceBuffer);
    console.log(`Updated icon: ${path.relative(ROOT, dest)}`);
  }
}

// Target drawable directories for splash screen
const drawableDirs = [
  'drawable',
  'drawable-land-mdpi',
  'drawable-land-hdpi',
  'drawable-land-xhdpi',
  'drawable-land-xxhdpi',
  'drawable-land-xxxhdpi',
  'drawable-port-mdpi',
  'drawable-port-hdpi',
  'drawable-port-xhdpi',
  'drawable-port-xxhdpi',
  'drawable-port-xxxhdpi',
];

for (const dir of drawableDirs) {
  const targetDir = path.join(RES_DIR, dir);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const dest = path.join(targetDir, 'splash.png');
  fs.writeFileSync(dest, sourceBuffer);
  console.log(`Updated splash: ${path.relative(ROOT, dest)}`);
}

console.log('Voyager character assets successfully integrated into Android project!');
