# Chalo On Tour Backend

Backend API server for Chalo On Tour CRM system.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
CLIENT_URL=your_frontend_url
JWT_SECRET=your_jwt_secret_key
```

3. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Build command: `npm install`
4. Output directory: (leave empty for serverless)
5. Install command: `npm install`

### Render Deployment

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Build command: `npm install`
4. Start command: `npm start`
5. Set environment variables in Render dashboard

### Railway Deployment

1. Create a new project on Railway
2. Connect your GitHub repository
3. Railway will auto-detect Node.js
4. Set environment variables in Railway dashboard

## API Endpoints

- `/api/auth/*` - Authentication routes
- `/api/leads/*` - Lead management routes
- `/api/users/*` - User management routes
- `/api/templates/*` - Package template routes
- `/api/stats/*` - Statistics routes

## Default Users

- Super Admin: `sadmin@gmail.com` / `123456`
- Staff: `staff@gmail.com` / `123456`

## Notes

- Make sure MongoDB connection string is set correctly
- CORS is configured for localhost:3000 and localhost:3001 by default
- For production, set `CLIENT_URL` environment variable

