import jwt from 'jsonwebtoken';

// Middleware to authenticate JWT tokens and attach user info to req.user
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    let token = null;

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';

    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
      }

      // Attach decoded info to request (matches payload from authRoutes)
      req.user = {
        id: decoded.userId,
        uid: decoded.uid,
        role: decoded.role,
        email: decoded.email
      };

      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ success: false, message: 'Authentication error' });
  }
};