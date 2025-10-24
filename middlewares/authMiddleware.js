// backend/middlewares/authMiddleware.js
import { verifyToken } from '@clerk/clerk-sdk-node';
import asyncHandler from 'express-async-handler';

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token found' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // ✅ Verify token with your Clerk secret key
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!verifiedToken?.sub) {
      return res.status(401).json({ message: 'Invalid or missing user ID in token' });
    }

    req.auth = { userId: verifiedToken.sub };
    next();
  } catch (error) {
    console.error('❌ Clerk verification error:', error.message);
    res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
});
