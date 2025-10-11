# 🔗 RECONNECT RENDER TO GITHUB

**Issue:** Render dashboard doesn't show your backend deployment  
**Solution:** Reconnect GitHub repository to Render

---

## 🎯 **STEP-BY-STEP GUIDE**

### **Step 1: Go to Render Dashboard**

Visit: **https://dashboard.render.com/**

Log in with your account.

---

### **Step 2: Check for Existing Service**

**Look for:**
- Service name: "syncscript-backend" or similar
- Status: May show "Suspended" or "Disconnected"

**If you find it:**
- Click on the service
- Go to "Settings" tab
- Scroll to "Build & Deploy"
- Check if GitHub repo is connected
- If not, click "Connect GitHub" and select your repo

**If you DON'T find it:**
- You'll need to create a new service (continue to Step 3)

---

### **Step 3: Create New Web Service**

Click the **"New +"** button (top right)

Select: **"Web Service"**

---

### **Step 4: Connect GitHub Repository**

**Option A: If GitHub is already connected:**
- Select "stringerc/syncscript-backend" from the list
- Click "Connect"

**Option B: If GitHub is not connected:**
1. Click "Connect GitHub"
2. Authorize Render to access your repositories
3. Select "syncscript-backend" repository
4. Click "Connect"

---

### **Step 5: Configure Service**

**Name:**
```
syncscript-backend
```

**Environment:**
```
Node
```

**Region:**
```
Oregon (US West) or closest to you
```

**Branch:**
```
main
```

**Build Command:**
```
npm install && npm run build
```

**Start Command:**
```
npm start
```

**Plan:**
```
Free (or select paid plan for better performance)
```

---

### **Step 6: Set Environment Variables**

Click **"Advanced"** or go to **"Environment"** tab after creation.

**Add these variables:**

```
DATABASE_URL=your_postgres_connection_string_here
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://syncscript-api
NODE_ENV=production
PORT=3001
```

**Optional (if you have them):**
```
OPENAI_API_KEY=your_key
REDIS_URL=your_redis_url
JWT_SECRET=your_secret
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

---

### **Step 7: Create Service & Deploy**

Click: **"Create Web Service"**

Render will:
1. Clone your GitHub repo
2. Install dependencies
3. Build your TypeScript code
4. Start the server
5. Assign you a URL

**Wait time:** 3-5 minutes

---

### **Step 8: Get Your Backend URL**

Once deployed, you'll see:

```
https://syncscript-backend-XXXXX.onrender.com
```

**Copy this URL!** You'll need it for your frontend.

---

## ✅ **VERIFY DEPLOYMENT**

### **Test 1: Health Check**
```bash
curl https://your-service-name.onrender.com/health
```

**Expected:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-11T...",
  "version": "1.0.0"
}
```

### **Test 2: API Info**
```bash
curl https://your-service-name.onrender.com/api
```

**Expected:**
```json
{
  "message": "SyncScript API is running!",
  "version": "1.0.0",
  "endpoints": {...}
}
```

### **Test 3: Rate Limiting**
Open browser to: `https://your-service-name.onrender.com/health`

Refresh 20+ times quickly. After 100 requests in 1 minute, you should see:
```json
{
  "error": "Rate limit exceeded"
}
```

---

## 🔧 **UPDATE FRONTEND**

Once your backend is deployed:

### **Update Environment Variable:**

**For Vercel (Production):**
1. Go to: https://vercel.com/christopher-stringers-projects/syncscript-frontend
2. Click "Settings"
3. Click "Environment Variables"
4. Find `NEXT_PUBLIC_API_URL`
5. Update value to: `https://your-new-backend-url.onrender.com`
6. Click "Save"

**For Local Development:**
```bash
cd ~/syncscript-frontend

# Edit .env.local
nano .env.local

# Update this line:
NEXT_PUBLIC_API_URL='https://your-new-backend-url.onrender.com'

# Save and exit (Ctrl+X, Y, Enter)
```

### **Redeploy Frontend:**
```bash
cd ~/syncscript-frontend
vercel --prod
```

---

## 🔍 **TROUBLESHOOTING**

### **"Build Failed" Error:**

**Check:**
1. `package.json` has all dependencies
2. `npm run build` works locally
3. Render build logs for specific error

**Fix:**
```bash
cd ~/syncscript-backend
npm install
npm run build
# If this works, push to GitHub and redeploy
```

### **"Service Won't Start" Error:**

**Check:**
1. `npm start` works locally
2. PORT is set in environment variables
3. Database connection string is correct

**Fix:**
- Check Render logs (click on service → "Logs" tab)
- Look for error messages
- Fix the issue and push to GitHub

### **"GitHub Not Connected" Issue:**

**Fix:**
1. Go to Render Dashboard
2. Click your profile icon
3. Go to "Account Settings"
4. Click "GitHub"
5. Click "Connect GitHub Account"
6. Authorize Render
7. Go back and try connecting your service again

### **"Free Tier Sleep" Warning:**

On Render Free tier:
- Service sleeps after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds
- **Solution:** Upgrade to paid plan (~$7/month) for always-on

---

## 📊 **MONITORING YOUR SERVICE**

### **Render Dashboard:**
- **Logs:** Real-time server logs
- **Metrics:** CPU, Memory, Request counts
- **Events:** Deployment history

### **Check Service Health:**
- Green dot = Live
- Yellow dot = Building
- Red dot = Failed

### **Auto-Deploy:**
Once connected, Render auto-deploys on every push to `main` branch!

---

## ✅ **SUCCESS CHECKLIST**

- [ ] Logged into Render Dashboard
- [ ] Connected GitHub repository
- [ ] Created/Updated web service
- [ ] Set environment variables
- [ ] Service deployed successfully
- [ ] Health endpoint returns 200
- [ ] API endpoint returns data
- [ ] Rate limiting works
- [ ] Frontend environment variable updated
- [ ] Frontend redeployed
- [ ] End-to-end test: Frontend → Backend → Database

---

## 🎉 **ONCE DEPLOYED**

Your backend will be:
- ✅ Live at your Render URL
- ✅ Auto-deploying on Git push
- ✅ Protected by rate limiting
- ✅ Secured with CSRF protection
- ✅ Running with enterprise security!

---

**Need help?** Check Render logs or run health check endpoint!

**Your Render URL:** https://syncscript-backend-XXXXX.onrender.com  
**Your GitHub Repo:** https://github.com/stringerc/syncscript-backend


