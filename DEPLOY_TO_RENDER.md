# 🚀 DEPLOY SYNCSCRIPT BACKEND TO RENDER

**Security Middleware Added:** Rate Limiting + CSRF Protection ✅

---

## ✅ **WHAT WAS ADDED**

### **New Middleware:**
1. **Rate Limiting** (`src/middleware/rateLimiter.ts`)
   - AI endpoints: 10 requests/min
   - Auth endpoints: 5 requests/min
   - General API: 100 requests/min

2. **CSRF Protection** (`src/middleware/csrf.ts`)
   - Protects against cross-site request forgery
   - Uses HTTP-only cookies

3. **Integration** (`src/app.ts`)
   - Middleware imported and applied
   - Security layers active

### **New Dependencies:**
- `csurf` - CSRF protection
- `cookie-parser` - Cookie handling
- `express-rate-limit` - Rate limiting

---

## 🚀 **DEPLOYMENT STEPS**

### **Step 1: Commit Your Changes**

```bash
cd ~/syncscript-backend

# Add all changes
git add .

# Commit
git commit -m "Add rate limiting and CSRF protection middleware"

# Check remote
git remote -v
```

### **Step 2: Push to GitHub**

```bash
# Push to main branch
git push origin main

# Or if you use master:
git push origin master
```

### **Step 3: Connect to Render**

Go to: **https://dashboard.render.com/**

**Option A: If you have an existing service:**
1. Find your "syncscript-backend" service
2. Click on it
3. Go to "Settings"
4. Under "Build & Deploy"
5. Click "Manual Deploy" → "Deploy latest commit"

**Option B: If you need to create a new service:**
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select "syncscript-backend" repo
4. Configure:
   - **Name:** syncscript-backend
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid)

### **Step 4: Set Environment Variables**

In Render Dashboard → Your Service → Environment:

**Required:**
```
DATABASE_URL=your_postgres_connection_string
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=your_api_identifier
NODE_ENV=production
PORT=3001
```

**Optional:**
```
OPENAI_API_KEY=your_openai_key
REDIS_URL=your_redis_url
JWT_SECRET=your_jwt_secret
```

### **Step 5: Deploy**

- If connected: Render auto-deploys on push
- If manual: Click "Manual Deploy" button
- Wait 3-5 minutes for deployment

---

## ✅ **VERIFY DEPLOYMENT**

### **1. Check Render Dashboard**
- Service status should be "Live" (green)
- Logs should show "Server running on port 3001"
- No errors in logs

### **2. Test Health Endpoint**
```bash
curl https://your-service-name.onrender.com/health
```

**Expected response:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-11T...",
  "version": "1.0.0",
  "database": "connected",
  "auth": "configured"
}
```

### **3. Test Rate Limiting**
```bash
# Should work for first few requests
for i in {1..15}; do 
  curl https://your-service-name.onrender.com/api/suggestions/test
  echo ""
done

# After 10 requests in 1 min, should get 429 error:
# {"error":"Rate limit exceeded"}
```

### **4. Check CSRF Protection**
```bash
# POST without CSRF token should fail
curl -X POST https://your-service-name.onrender.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'

# Expected: 403 Forbidden (CSRF token missing)
```

---

## 🔧 **UPDATE FRONTEND**

Once backend is deployed, update your frontend `.env`:

```env
NEXT_PUBLIC_API_URL=https://your-service-name.onrender.com
```

Then redeploy frontend:
```bash
cd ~/syncscript-frontend
vercel --prod
```

---

## 🔍 **TROUBLESHOOTING**

### **Build Fails:**
- Check package.json has all dependencies
- Verify `npm run build` works locally
- Check Render logs for specific error

### **Service Won't Start:**
- Check `npm start` works locally
- Verify PORT environment variable is set
- Check database connection string

### **Rate Limiting Not Working:**
- Check Render logs for middleware errors
- Verify express-rate-limit is installed
- Test with curl (multiple requests)

### **CSRF Issues:**
- Frontend needs to handle CSRF tokens
- Check cookies are being sent
- Verify cookie-parser is working

---

## 📊 **MONITORING**

### **Render Dashboard:**
- Check CPU/Memory usage
- Monitor request counts
- Watch error logs

### **Rate Limit Stats:**
- Watch for 429 errors (rate limit hit)
- Adjust limits if needed in `rateLimiter.ts`

### **CSRF Protection:**
- Watch for 403 errors (CSRF validation failed)
- Ensure frontend sends tokens correctly

---

## 🎯 **QUICK START**

**Fastest way to deploy:**

```bash
cd ~/syncscript-backend

# 1. Commit
git add .
git commit -m "Add security middleware"

# 2. Push
git push origin main

# 3. Go to Render Dashboard
# 4. Service should auto-deploy!
```

---

## ✅ **SUCCESS CHECKLIST**

- [ ] Code committed to Git
- [ ] Pushed to GitHub
- [ ] Render service connected
- [ ] Environment variables set
- [ ] Deployment successful
- [ ] /health endpoint returns 200
- [ ] Rate limiting works (429 after limit)
- [ ] CSRF protection active
- [ ] Frontend updated with new backend URL
- [ ] End-to-end test successful

---

**Your backend is now production-ready with enterprise-grade security!** 🔐🚀


