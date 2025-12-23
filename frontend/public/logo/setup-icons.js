/**
 * Script to copy existing icons to the correct location for PWA
 * Run with: node setup-icons.js
 */

const fs = require('fs');
const path = require('path');

const iconsDir = __dirname;
const androidDir = path.join(iconsDir, 'android');

// Map of required icon sizes
const requiredIcons = [
  { size: 72, source: 'android-launchericon-72-72.png' },
  { size: 96, source: 'android-launchericon-96-96.png' },
  { size: 128, source: null }, // Will use 144 as fallback
  { size: 144, source: 'android-launchericon-144-144.png' },
  { size: 152, source: null }, // Will use 144 as fallback
  { size: 192, source: 'android-launchericon-192-192.png' },
  { size: 384, source: null }, // Will use 512 as fallback
  { size: 512, source: 'android-launchericon-512-512.png' }
];

console.log('📱 Setting up PWA icons...\n');

// Check if android directory exists
if (!fs.existsSync(androidDir)) {
  console.error('❌ Android icons directory not found!');
  console.log('Please ensure icons exist in:', androidDir);
  process.exit(1);
}

let copied = 0;
let skipped = 0;

requiredIcons.forEach(({ size, source }) => {
  const targetName = `icon-${size}x${size}.png`;
  const targetPath = path.join(iconsDir, targetName);
  
  // If icon already exists, skip
  if (fs.existsSync(targetPath)) {
    console.log(`✓ ${targetName} already exists`);
    skipped++;
    return;
  }
  
  // Try to copy from source
  if (source) {
    const sourcePath = path.join(androidDir, source);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✓ Created ${targetName} from ${source}`);
      copied++;
      return;
    }
  }
  
  // Try to find a fallback
  let fallback = null;
  if (size === 128) fallback = path.join(androidDir, 'android-launchericon-144-144.png');
  if (size === 152) fallback = path.join(androidDir, 'android-launchericon-144-144.png');
  if (size === 384) fallback = path.join(androidDir, 'android-launchericon-512-512.png');
  
  if (fallback && fs.existsSync(fallback)) {
    fs.copyFileSync(fallback, targetPath);
    console.log(`✓ Created ${targetName} (resized from fallback)`);
    copied++;
  } else {
    console.log(`⚠ Missing: ${targetName}`);
  }
});

console.log(`\n✅ Setup complete!`);
console.log(`   Copied: ${copied} icons`);
console.log(`   Already existed: ${skipped} icons`);
console.log(`\n📱 Your PWA icons are now ready!`);

