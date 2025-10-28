# Vercel Deployment Guide for FreshCart

## Backend Deployment

### 1. Environment Variables
After deploying to Vercel, you must set these environment variables in your Vercel project settings:

```
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_generated_secret_key
PORT=5000
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key
```

### 2. Project Settings
- **Framework Preset**: Other
- **Root Directory**: backend
- **Build Command**: npm run build
- **Output Directory**: .

### 3. Important Considerations

#### File Upload Limitations
Vercel has an ephemeral file system. Files uploaded to the `uploads/` directory won't persist across deployments.

**For production, consider using:**
- AWS S3
- Firebase Storage
- Cloudinary
- Vercel Blob storage

#### Cron Jobs
Scheduled jobs might not work as expected on Vercel due to the serverless environment.

**Solutions:**
- Use Vercel's built-in Cron Jobs feature (for Pro accounts)
- Move scheduled tasks to a separate service

#### Real-time Features (Socket.IO)
Socket.IO functionality is limited on Vercel's serverless environment. For production real-time features, consider using a separate WebSocket service.

## Frontend Deployment

### 1. Environment Variables
Set these environment variables in your frontend Vercel project:

```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_API_BASE_URL=https://your-backend-project.vercel.app/api
```

### 2. Project Settings
- **Framework Preset**: Vite
- **Root Directory**: frontend
- **Build Command**: npm run build
- **Output Directory**: dist

## Post-Deployment Steps

### 1. Update CORS Configuration
After deploying both frontend and backend, update the CORS configuration in `backend/server.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'https://your-frontend.vercel.app', // Your deployed frontend URL
    'https://your-custom-domain.com'   // If you have a custom domain
  ],
  credentials: true
}));
```

### 2. Redeploy
After making any configuration changes, redeploy both projects on Vercel.

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your frontend URL is added to the CORS configuration
2. **Environment Variables**: Verify all required environment variables are set
3. **MongoDB Connection**: Ensure your MongoDB Atlas connection string is correct and IP whitelist is configured
4. **File Upload Issues**: Remember that uploaded files won't persist on Vercel
5. **500 Errors**: Check that your server.js file properly exports the app for Vercel

### Checking Logs
Use Vercel's dashboard to check deployment logs and runtime logs for troubleshooting.