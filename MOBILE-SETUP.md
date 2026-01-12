# 📱 Get Yoga Walk on Your Phone

## Quick Setup Guide

There are two ways to get your app on your phone:
1. **Local Testing** - Test on your phone while developing (easiest)
2. **Deploy** - Host online and install permanently (production)

---

## Method 1: Local Testing (Recommended for Development)

### Step 1: Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.x.x.x)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```

### Step 2: Start Backend Server

Open a terminal and run:
```bash
cd backend
python app.py
```

The backend will run on `http://localhost:5000`

**IMPORTANT:** Update Flask to allow external connections:

Edit `backend/app.py` and change the last line from:
```python
app.run(debug=True)
```

To:
```python
app.run(debug=True, host='0.0.0.0', port=5000)
```

This allows your phone to connect to the backend.

### Step 3: Start Frontend with Network Access

Open a **new terminal** and run:
```bash
cd frontend
npm run dev -- --host
```

Or edit `frontend/vite.config.js` to always allow network access:
```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow network access
    port: 5173
  }
});
```

### Step 4: Update API URL for Mobile

The frontend needs to connect to your computer's IP, not localhost.

**Option A: Environment Variable (Recommended)**

Create `frontend/.env.local`:
```
VITE_API_URL=http://YOUR_IP_ADDRESS:5000
```

Then update `frontend/src/pages/MapPage.jsx` to use it:
```javascript
const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
```

**Option B: Quick Fix - Update Directly**

Find this line in `frontend/src/pages/MapPage.jsx` (around line 616):
```javascript
const apiBase = "http://localhost:5000";
```

Change to:
```javascript
const apiBase = "http://YOUR_IP_ADDRESS:5000"; // Replace with your IP
```

### Step 5: Access from Your Phone

1. Make sure your phone is on the **same WiFi network** as your computer
2. Open your phone's browser (Chrome for Android, Safari for iOS)
3. Go to: `http://YOUR_IP_ADDRESS:5173`
   - Example: `http://192.168.1.100:5173`

### Step 6: Install as PWA

**Android (Chrome):**
1. Open the app in Chrome
2. Tap the menu (three dots) → "Add to Home screen"
3. Tap "Add"
4. App icon appears on home screen!

**iOS (Safari):**
1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"
5. App icon appears on home screen!

---

## Method 2: Deploy Online (Production)

### Option A: Free Hosting Services

**Frontend (Static Hosting):**
- **Vercel** (Recommended): https://vercel.com
  - Connect GitHub repo
  - Auto-deploys on push
  - Free HTTPS included

- **Netlify**: https://netlify.com
  - Drag & drop build folder
  - Free HTTPS included

- **GitHub Pages**: Free but requires GitHub repo

**Backend (Server Hosting):**
- **Railway**: https://railway.app (Free tier available)
- **Render**: https://render.com (Free tier)
- **Heroku**: https://heroku.com (Paid, but has free tier)
- **PythonAnywhere**: https://pythonanywhere.com (Free tier)

### Option B: Quick Deploy Steps

1. **Build Frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy Frontend:**
   - Upload `frontend/dist` folder to hosting service
   - Update API URL to point to your backend

3. **Deploy Backend:**
   - Upload backend files to server
   - Install Python dependencies
   - Run Flask app

4. **Update API URL:**
   - Change `apiBase` in MapPage.jsx to your backend URL
   - Rebuild and redeploy

---

## Troubleshooting

### "Can't connect to server"
- ✅ Check both devices are on same WiFi
- ✅ Check firewall isn't blocking ports 5000 and 5173
- ✅ Verify IP address is correct
- ✅ Make sure backend is running with `host='0.0.0.0'`

### "PWA won't install"
- ✅ Make sure you have icons created (see PWA-QUICKSTART.md)
- ✅ Access via HTTPS or localhost (HTTP works on localhost)
- ✅ Check browser console for errors

### "API calls failing"
- ✅ Verify backend is accessible: `http://YOUR_IP:5000/api/poses`
- ✅ Check CORS is enabled in Flask (already done)
- ✅ Update `apiBase` URL in MapPage.jsx

### "Location not working"
- ✅ PWA requires HTTPS (except localhost)
- ✅ Grant location permissions in browser settings
- ✅ Check device location services are enabled

---

## Quick Test Checklist

- [ ] Backend running on `http://YOUR_IP:5000`
- [ ] Frontend running on `http://YOUR_IP:5173`
- [ ] Can access frontend from phone browser
- [ ] API calls work (check Network tab in phone browser)
- [ ] Icons created for PWA
- [ ] Can install as PWA
- [ ] Location services work

---

## Security Note

⚠️ **For Production:**
- Never expose database credentials in code
- Use environment variables for sensitive data
- Enable HTTPS (required for PWA features)
- Use proper authentication if needed

---

## Next Steps

Once installed on your phone:
1. Test all features (maps, location, checkpoints)
2. Test offline functionality
3. Share with friends to test!
4. Deploy to production when ready

Need help? Check:
- `PWA-QUICKSTART.md` - PWA setup
- `PWA-SETUP.md` - Detailed PWA docs
- Browser console for errors







