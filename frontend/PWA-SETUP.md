# PWA Setup Guide for Yoga Walk

## ✅ What's Already Done

1. ✅ **Manifest File** (`public/manifest.webmanifest`) - Configured with all PWA settings
2. ✅ **Service Worker** (`public/sw.js`) - Handles offline caching and updates
3. ✅ **Meta Tags** (`index.html`) - Added PWA meta tags for iOS and Android
4. ✅ **Service Worker Registration** (`src/main.jsx`) - Auto-registers and handles updates

## 📋 What You Need to Do

### Step 1: Create PWA Icons

You need to create icon files in these sizes:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

**Quick Options:**

1. **Use Online Tools** (Easiest):
   - Visit https://www.pwabuilder.com/imageGenerator
   - Upload your icon
   - Download all sizes
   - Place Android icons in `public/logo/android/`
   - Place iOS icons in `public/logo/ios/`

2. **Create Manually**:
   - Design a 512x512 icon (use your brand colors: #4d672a)
   - Resize to all required sizes
   - Save Android icons as: `android-launchericon-{size}-{size}.png`
   - Save iOS icons as: `{size}.png`

**File Structure:**
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

### Step 2: Test Your PWA

1. **Build the app:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Serve with HTTPS** (required for PWA):
   ```bash
   npm run preview
   ```
   Or use a local HTTPS server like `serve`:
   ```bash
   npx serve -s dist --ssl
   ```

3. **Test Installation:**
   - Open in Chrome/Edge
   - Open DevTools → Application → Manifest
   - Check for errors
   - Click "Install" button in address bar

### Step 3: Test on Mobile

**Android:**
- Open Chrome on Android
- Navigate to your app URL
- Tap menu → "Add to Home screen"
- App should install as PWA

**iOS:**
- Open Safari on iPhone/iPad
- Navigate to your app URL
- Tap Share → "Add to Home Screen"
- App will appear as standalone app

## 🔧 Configuration Options

### Update Manifest Colors

Edit `public/manifest.webmanifest`:
- `theme_color`: Color of browser UI (currently #4d672a)
- `background_color`: Splash screen color (currently #f5f5f5)

### Update Service Worker Cache

Edit `public/sw.js`:
- Add URLs to `PRECACHE_URLS` array for offline caching
- Adjust cache version (`CACHE_NAME`) when updating assets

### Enable Offline Features

The service worker already caches:
- Main HTML file
- Static assets
- API responses (runtime cache)

To add more offline support:
1. Add routes to `PRECACHE_URLS`
2. Implement offline fallback pages
3. Add background sync for API calls

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All icon sizes created and in `public/logo/android/` and `public/logo/ios/`
- [ ] Manifest tested (no errors in DevTools)
- [ ] Service worker registered successfully
- [ ] App works offline (test with network throttling)
- [ ] HTTPS enabled (required for PWA)
- [ ] Tested on Android device
- [ ] Tested on iOS device
- [ ] Splash screen looks good
- [ ] App icon appears correctly on home screen

## 🐛 Troubleshooting

**Icons not showing:**
- Check file paths in manifest match actual files
- Ensure icons are in `public/logo/android/` and `public/logo/ios/` folders
- Clear browser cache and reload

**Service worker not registering:**
- Check browser console for errors
- Ensure HTTPS is enabled (or localhost)
- Check `sw.js` file is accessible at `/sw.js`

**App won't install:**
- Verify manifest has no errors (DevTools → Application → Manifest)
- Ensure all required icons exist
- Check HTTPS is enabled
- Verify `start_url` and `scope` are correct

**Offline not working:**
- Check service worker is active (DevTools → Application → Service Workers)
- Verify assets are being cached
- Test with Network tab → Offline mode

## 📱 PWA Features Enabled

✅ **Installable** - Users can install to home screen
✅ **Offline Support** - Basic caching enabled
✅ **App-like Experience** - Standalone display mode
✅ **Auto Updates** - Service worker checks for updates
✅ **Fast Loading** - Assets cached for quick access

## 🎨 Next Steps (Optional Enhancements)

1. **Add Push Notifications** - Remind users about walks
2. **Background Sync** - Sync walk data when online
3. **Share Target** - Allow sharing routes to app
4. **File Handler** - Import/export walk data
5. **Badge API** - Show notification count
6. **Periodic Background Sync** - Sync data periodically

## 📚 Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [PWA Builder](https://www.pwabuilder.com/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

