# Environment Variables for Render Deployment

This document lists all environment variables required for deploying the Chalo On Tour Backend on Render.

## Required Environment Variables

### 1. MONGODB_URI
- **Description**: MongoDB connection string
- **Example**: `mongodb+szzrv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`
- **How to get**: 
  - Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
  - Create a new cluster
  - Click "Connect" → "Connect your application"
  - Copy the connection string and replace `<password>` with your database password

### 2. CLIENT_URL
- **Description**: Frontend URL for CORS configuration
- **Example**: `https://chaloontourclient.vercel.app`
- **Important**: 
  - Do NOT include trailing slash (e.g., use `https://chaloontourclient.vercel.app` NOT `https://chaloontourclient.vercel.app/`)
  - Can be comma-separated for multiple URLs (e.g., `https://app1.com,https://app2.com`)
  - Must match exactly the origin of your frontend requests
- **How to get**: Your deployed frontend URL on Render or Vercel (without trailing slash)

### 3. JWT_SECRET
- **Description**: Secret key for signing JWT tokens
- **Example**: `your-super-secret-random-string-here`
- **How to generate**: 
  ```bash
  # On Linux/Mac
  openssl rand -base64 32
  
  # Or use any random string generator
  # Minimum 32 characters recommended
  ```
- **Important**: Keep this secret and never commit it to Git

## Optional Environment Variables

### 4. PORT
- **Description**: Server port number
- **Default**: `5000`
- **Note**: Render automatically assigns a port, but you can override it
- **Example**: `10000`

### 5. JWT_EXPIRE
- **Description**: JWT token expiration time
- **Default**: `7d` (7 days)
- **Examples**: `1d`, `7d`, `30d`, `1h`, `24h`

### 6. NODE_ENV
- **Description**: Node.js environment mode
- **Default**: `development` (local), `production` (Render)
- **Values**: `development` or `production`
- **Note**: Render usually sets this automatically

## Setting Environment Variables in Render

### Method 1: Using Render Dashboard
1. Go to your Render dashboard
2. Select your service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add each variable with its value
6. Click **Save Changes**

### Method 2: Using render.yaml (Blueprint)
If using Render Blueprint, the `render.yaml` file will automatically configure the service, but you still need to set the secret values (MONGODB_URI, CLIENT_URL, JWT_SECRET) in the dashboard as they are marked with `sync: false`.

## Quick Setup Checklist

- [ ] MongoDB Atlas cluster created
- [ ] MongoDB connection string copied
- [ ] Frontend deployed and URL obtained
- [ ] JWT_SECRET generated (32+ characters)
- [ ] All environment variables added to Render dashboard
- [ ] Service redeployed after adding variables

## Testing Your Environment Variables

After deployment, check the logs to ensure:
1. MongoDB connection is successful
2. Server starts on the correct port
3. No CORS errors when accessing from frontend
4. Authentication endpoints work correctly

## Security Notes

- Never commit `.env` files to Git
- Use strong, random values for JWT_SECRET
- Keep MongoDB credentials secure
- Regularly rotate JWT_SECRET in production
- Use environment-specific values (different for dev/staging/prod)

