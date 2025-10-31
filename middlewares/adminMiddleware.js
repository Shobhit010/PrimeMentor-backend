// backend/middlewares/adminMiddleware.js

import asyncHandler from 'express-async-handler';

// IMPORTANT: Define the Admin Email here or in a secure environment variable
const ADMIN_EMAIL = 'shobhit2004poddar@gmail.com'; 

export const adminOnlyMiddleware = asyncHandler(async (req, res, next) => {
    // Check if req.auth is present (meaning requireAuth() passed)
    if (!req.auth || !req.auth.userId) {
        return res.status(401).json({ message: 'Authentication token missing or invalid.' });
    }
    
    // 🛑 SANITY CHECK 🛑
    if (!req.clerkClient) {
        // This indicates a critical setup error in server.js (clerkMiddleware() is missing or misplaced).
        console.error("CRITICAL ERROR: req.clerkClient is undefined. Is clerkMiddleware() running?");
        return res.status(500).json({ message: 'Clerk configuration error: Admin client not available.' });
    }

    try {
        // Fetch the detailed user object from Clerk using the ID.
        const user = await req.clerkClient.users.getUser(req.auth.userId);

        // Extract the primary verified email address
        const primaryEmail = user.emailAddresses.find(
            (e) => e.id === user.primaryEmailAddressId
        )?.emailAddress;

        if (primaryEmail === ADMIN_EMAIL) {
            // User is the admin. Proceed.
            next();
        } else {
            // User is authenticated but is not the admin email.
            res.status(403).json({ message: 'Access denied. Admin role required.' });
        }
    } catch (error) {
        // 🛑 CRASH HANDLER 🛑
        console.error('Error in adminOnlyMiddleware during Clerk user lookup:', error.message);
        // The error here is usually due to a failed connection to the Clerk API 
        // (API key issue or network problem).
        res.status(500).json({ message: 'Server error during admin verification: Clerk API call failed.' });
    }
});
