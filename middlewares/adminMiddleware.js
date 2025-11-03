// backend/middlewares/adminMiddleware.js

import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken'; // 🛑 NEW IMPORT FOR JWT VERIFICATION 🛑

// 🔑 HARDCODED TOKEN IS NO LONGER USED FOR VERIFICATION, ONLY FALLBACK
// const DEV_ADMIN_TOKEN = 'PRIME_MENTOR_ADMIN_SESSION_TOKEN'; 

export const adminOnlyMiddleware = asyncHandler(async (req, res, next) => {
    
    // 🛑 1. Check for the DEV bypass query parameter (retained from your code)
    if (process.env.NODE_ENV !== 'production' && req.query.dev_bypass === 'true') {
        console.log("ADMIN MIDDLEWARE BYPASSED FOR DEVELOPMENT.");
        return next();
    }
    
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Return 401 if token is missing or malformed
        return res.status(401).json({ message: 'Authentication required. Access token missing.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 🛑 FIX 6: Verify the JWT using the secret key
        // process.env.JWT_SECRET MUST be defined in your backend/.env file
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Ensure the decoded payload has the expected admin ID (optional but good practice)
        if (decoded.id === 'admin_root_id') {
            req.admin = { id: decoded.id, email: 'admin@primementor.com' }; 
            return next();
        } else {
            // The token is valid, but the user ID is incorrect (e.g., a teacher token used for admin)
            return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
        }
    } catch (error) {
        // Token verification failed (expired, invalid signature, etc.)
        console.error("JWT Verification failed:", error.message);
        return res.status(403).json({ message: 'Access denied. Invalid or expired administrative token.' });
    }
});