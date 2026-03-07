# CORS Error Fix - Quick Guide

## Your Current Setup
- **Frontend**: `https://chaloontourclient.vercel.app` (Vercel)
- **Backend**: `https://chalo-on-tour-server.onrender.com` (Render)

## The Problem
CORS (Cross-Origin Resource Sharing) error occurs because the backend is not configured to allow requests from your Vercel frontend URL.

## The Solution

### Step 1: Set CLIENT_URL in Render Dashboard

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your backend service: `chalo-on-tour-server`
3. Go to **Environment** tab
4. Find or add the environment variable:
   - **Key**: `CLIENT_URL`
   - **Value**: `https://chaloontourclient.vercel.app`
   - **Important**: No trailing slash!

5. Click **Save Changes**

### Step 2: Redeploy Your Backend

After saving the environment variable:
1. Go to **Manual Deploy** or wait for auto-deploy
2. Click **Deploy latest commit** (or it will auto-deploy)
3. Wait for deployment to complete

### Step 3: Verify the Fix

1. Check the deployment logs to ensure it started successfully
2. Try logging in from your frontend again
3. The CORS error should be resolved

## Expected CLIENT_URL Value

```
CLIENT_URL=https://chaloontourclient.vercel.app
```

**Do NOT use:**
- ❌ `https://chaloontourclient.vercel.app/` (with trailing slash)
- ❌ `https://chaloontourclient.vercel.app/api` (wrong path)
- ❌ `chaloontourclient.vercel.app` (without https://)

**Use:**
- ✅ `https://chaloontourclient.vercel.app` (exact format)

## Multiple Frontend URLs

If you have multiple frontend URLs (e.g., production + preview), separate them with commas:

```
CLIENT_URL=https://chaloontourclient.vercel.app,https://chaloontourclient-git-main.vercel.app
```

## Troubleshooting

### Still getting CORS errors?

1. **Check the exact origin**: Open browser DevTools → Network tab → Check the "Origin" header in the request
2. **Verify CLIENT_URL**: Make sure it matches exactly (case-sensitive, no trailing slash)
3. **Check backend logs**: Look for CORS warning messages in Render logs
4. **Clear browser cache**: Sometimes cached CORS errors persist
5. **Verify deployment**: Make sure the backend redeployed after setting CLIENT_URL

### Check Backend Logs

In Render dashboard, check the logs for:
- `CORS blocked origin:` - This shows which origins are being blocked
- `MongoDB connected` - Ensures backend is running
- Any error messages

## Testing

After setting CLIENT_URL and redeploying, test with:

```bash
# Test CORS from command line
curl -H "Origin: https://chaloontourclient.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://chalo-on-tour-server.onrender.com/api/auth/login \
     -v
```

You should see `Access-Control-Allow-Origin: https://chaloontourclient.vercel.app` in the response headers.

