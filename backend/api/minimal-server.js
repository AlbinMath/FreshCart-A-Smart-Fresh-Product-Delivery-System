// Minimal Express app for testing Vercel deployment
import express from 'express';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Minimal FreshCart API Running');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Minimal FreshCart API is running',
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel
export default app;