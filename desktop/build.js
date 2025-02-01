const fs = require('fs');
const path = require('path');

const distElectronPath = path.join(__dirname, 'dist-electron');
if (fs.existsSync(distElectronPath)) {
  fs.rmSync(distElectronPath, { recursive: true });
  console.log('Cleaned up old electron builds');
}

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true });
}
fs.mkdirSync(distPath, { recursive: true });
console.log('Created fresh dist directory');

const srcPath = path.join(__dirname, '..', 'dist');
fs.cpSync(srcPath, distPath, { recursive: true });

const publicPath = path.join(__dirname, '..', 'public');
const publicFiles = [
  'trusty.jpg',
  'apple-touch-icon.png',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'site.webmanifest',
  'android-chrome-512x512.png'
];

publicFiles.forEach(file => {
  const srcFile = path.join(publicPath, file);
  const destFile = path.join(distPath, file);
  
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, destFile);
    console.log(`Copied ${file} to desktop/dist`);
  } else {
    console.warn(`Warning: ${file} not found in public folder`);
  }
  
  if (file === 'android-chrome-512x512.png') {
    const iconFile = path.join(__dirname, 'icon.png');
    fs.copyFileSync(srcFile, iconFile);
    console.log('Copied app icon to desktop folder');
  }
});

const publicImagesPath = path.join(__dirname, '..', 'public', 'images');
const distImagesPath = path.join(distPath, 'images');

if (fs.existsSync(publicImagesPath)) {
  if (!fs.existsSync(distImagesPath)) {
    fs.mkdirSync(distImagesPath, { recursive: true });
  }
  fs.cpSync(publicImagesPath, distImagesPath, { recursive: true });
} 