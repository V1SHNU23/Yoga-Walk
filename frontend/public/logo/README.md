# PWA Icons Guide

## Required Icon Sizes

Your PWA needs icons in the following sizes:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192 (required)
- 384x384
- 512x512 (required)

## How to Generate Icons

### Option 1: Using Online Tools (Easiest)

1. **PWA Asset Generator** (Recommended):
   - Visit: https://www.pwabuilder.com/imageGenerator
   - Upload a 512x512 image
   - Download all generated sizes

2. **RealFaviconGenerator**:
   - Visit: https://realfavicongenerator.net/
   - Upload your icon
   - Configure settings
   - Download and extract icons

### Option 2: Using Image Editing Software

1. Create a 512x512px square image with your app logo/icon
2. Export/resize to all required sizes
3. Save as PNG files with names: `icon-{size}x{size}.png`

### Option 3: Using Command Line (ImageMagick)

If you have ImageMagick installed:

```bash
# Create a base 512x512 icon first, then:
convert icon-512x512.png -resize 72x72 icon-72x72.png
convert icon-512x512.png -resize 96x96 icon-96x96.png
convert icon-512x512.png -resize 128x128 icon-128x128.png
convert icon-512x512.png -resize 144x144 icon-144x144.png
convert icon-512x512.png -resize 152x152 icon-152x152.png
convert icon-512x512.png -resize 192x192 icon-192x192.png
convert icon-512x512.png -resize 384x384 icon-384x384.png
```

### Option 4: Quick Start - Use Emoji/Text Icon

For quick testing, you can create a simple SVG icon:

1. Create `icon.svg` with your design
2. Convert to PNG at all sizes using an online converter

## Icon Design Tips

- Use a simple, recognizable design
- Ensure it looks good at small sizes (72x72)
- Use your brand colors (#4d672a green)
- Consider adding a yoga pose silhouette or walking path icon
- Keep it centered with padding (safe area)

## Quick Test Icon

If you need a placeholder quickly, you can:
1. Create a simple green circle with "YW" text
2. Use a yoga emoji (🧘) as a base
3. Use a walking path icon

## File Structure

Place PWA logo icons in: `frontend/public/logo/`

**Note:** This folder (`public/logo/`) is for PWA app logos. App UI icons are in `src/icons/`.

```
frontend/public/logo/
  ├── android/
  │   ├── android-launchericon-72-72.png
  │   ├── android-launchericon-96-96.png
  │   ├── android-launchericon-144-144.png
  │   ├── android-launchericon-192-192.png
  │   └── android-launchericon-512-512.png
  └── ios/
      ├── 57.png
      ├── 60.png
      ├── 72.png
      ├── 76.png
      ├── 114.png
      ├── 120.png
      ├── 144.png
      ├── 152.png
      ├── 180.png
      ├── 192.png
      └── 1024.png
```

