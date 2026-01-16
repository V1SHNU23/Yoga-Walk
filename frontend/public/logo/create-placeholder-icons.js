/**
 * Quick script to create placeholder PWA icons
 * Run with: node create-placeholder-icons.js
 * 
 * Requires: npm install sharp (or use online tools instead)
 */

const fs = require('fs');
const path = require('path');

// Icon sizes needed
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Simple SVG template for placeholder icon
const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#4d672a" rx="${size * 0.2}"/>
  <text 
    x="50%" 
    y="50%" 
    font-family="Arial, sans-serif" 
    font-size="${size * 0.4}" 
    font-weight="bold" 
    fill="white" 
    text-anchor="middle" 
    dominant-baseline="central"
  >YW</text>
</svg>
`;

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname);
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Creating placeholder icons...');
console.log('Note: These are SVG placeholders. For production, convert to PNG using:');
console.log('  - Online: https://cloudconvert.com/svg-to-png');
console.log('  - Or use the generate-icons.html tool\n');

sizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✓ Created ${filename}`);
});

console.log('\n✅ Placeholder icons created!');
console.log('⚠️  Remember to convert SVG to PNG for production use.');

