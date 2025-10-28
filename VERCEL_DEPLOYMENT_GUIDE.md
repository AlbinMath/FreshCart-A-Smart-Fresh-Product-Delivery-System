# Vercel Deployment Guide for FreshCart

This guide explains how to deploy FreshCart to Vercel with separate frontend and backend deployments that work together seamlessly.

## Environment Configuration

FreshCart is configured to work in both local development and production environments with automatic environment detection.

### Frontend Environment Variables

The frontend uses environment variables to determine which API URL to use:

1. **Local Development (.env.local)**:
   ```
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_API_PROD_URL=https://your-backend-vercel-url.vercel.app/api
   ```

2. **Production (.env.production)**:
   ```
   VITE_API_BASE_URL=https://your-backend-vercel-url.vercel.app/api
   VITE_API_PROD_URL=https://your-backend-vercel-url.vercel.app/api
   ```

The frontend automatically detects the environment and uses the appropriate API URL:
- Local development: Uses `VITE_API_BASE_URL`
- Production: Uses `VITE_API_PROD_URL`

### How It Works

In `src/services/apiService.js`, the API base URL is determined dynamically:

```javascript
const getApiBaseUrl = () => {
  // For production/vercel deployment, use the production API URL
  if (import.meta.env.VITE_API_PROD_URL && window && window.location && !window.location.hostname.includes('localhost')) {
    return import.meta.env.VITE_API_PROD_URL;
  }
  // For local development, use the local API URL
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
};
```

## Backend Vercel Configuration

The backend is configured with a `vercel.json` file that routes API requests properly:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    }
  ]
}
```

The backend uses `serverless-http` to convert the Express app into a serverless function that works with Vercel.

## Deployment URLs

After deployment, your applications will be available at:

- Frontend: https://your-frontend-vercel-url.vercel.app/
- Backend: https://your-backend-vercel-url.vercel.app/

## Testing the Configuration

To verify that your configuration is working correctly:

1. Check the browser console for API requests - they should point to the correct backend URL
2. Use the ApiTestComponent to test connectivity
3. Monitor network requests in browser dev tools

## Troubleshooting

### CORS Issues

If you encounter CORS issues, ensure that your backend's CORS configuration includes your frontend URL:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-frontend-vercel-url.vercel.app',
    /\.vercel\.app$/  // Allow all Vercel deployments
  ],
  credentials: true
}));
```

### API Requests Failing

If API requests are failing:

1. Verify that your backend Vercel URL is correctly set in the frontend environment variables
2. Check that your backend routes are properly configured in `vercel.json`
3. Ensure MongoDB connection string is set in Vercel environment variables
4. Check Vercel logs for any error messages

### Environment Variables Not Loading

If environment variables are not loading:

1. Ensure you're using the correct file names (`.env.local`, `.env.production`)
2. Verify that variable names start with `VITE_` for frontend variables
3. Check that you've added the variables in the Vercel project settings