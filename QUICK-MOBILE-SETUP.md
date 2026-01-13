# 📱 Quick Guide: Get App on Your Phone

## 🚀 Fastest Way (5 minutes)

### Step 1: Find Your IP Address

**Windows:**
```bash
ipconfig
```
Copy the "IPv4 Address" (looks like `192.168.1.100`)

**Mac:**
```bash
ifconfig | grep "inet "
```
Look for IP starting with `192.168` or `10.`

### Step 2: Start Backend

```bash
cd backend
python app.py
```
✅ Backend now accepts connections from your phone!

### Step 3: Configure API URL

Create file `frontend/.env.local`:
```
VITE_API_URL=http://YOUR_IP_ADDRESS:5000
```

Replace `YOUR_IP_ADDRESS` with the IP from Step 1.

Example:
```
VITE_API_URL=http://192.168.1.100:5000
```

### Step 4: Start Frontend

```bash
cd frontend
npm run dev
```

You'll see:
```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/
```

### Step 5: Open on Phone

1. Make sure phone is on **same WiFi** as computer
2. Open browser on phone
3. Go to: `http://YOUR_IP_ADDRESS:5173`
   - Example: `http://192.168.1.100:5173`

### Step 6: Install PWA

**Android (Chrome):**
- Menu (⋮) → "Add to Home screen" → "Add"

**iPhone (Safari):**
- Share (□↑) → "Add to Home Screen" → "Add"

## ✅ Done!

Your app is now on your phone! 

## 🔧 Troubleshooting

**Can't connect?**
- Check both devices on same WiFi
- Try turning off firewall temporarily
- Verify IP address is correct

**API not working?**
- Check `.env.local` file exists
- Restart frontend after creating `.env.local`
- Verify backend is running

**Need more help?**
See `MOBILE-SETUP.md` for detailed guide.









