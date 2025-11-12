// backend/server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import teacherRouter from './routes/teacherRoutes.js';
import userRoutes from './routes/userRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js'; 
// REMOVE: import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import adminRoutes from './routes/adminRoutes.js'; // 🛑 NEW IMPORT 🛑
// ADD:
import { clerkMiddleware, requireAuth } from '@clerk/express';

dotenv.config();

// ... (Environment Variable Validations remain the same) ...

// Express
const app = express();
const PORT = process.env.PORT || 5000;

// Replace 'http://localhost:5173' with the URL where your frontend will be hosted.
// For now, let's keep it simple, but remember to update it to your Hostinger domain later.
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://primementor.com.au'; 
const allowedOrigins = [
    'http://localhost:5173', // Local development
    FRONTEND_URL, // e.g., https://primementor.com.au
    `https://www.${FRONTEND_URL.replace(/https?:\/\//, '')}` // e.g., https://www.primementor.com.au
];
// For production, you could read this from an environment variable (e.g., process.env.FRONTEND_URL)

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

app.use(express.json());
connectDB(); 

// ADD the clerkMiddleware as a global middleware
app.use(clerkMiddleware()); 

// Static uploads
app.use('/images', express.static('uploads'));

// Routes
console.log('✅ Registering teacher routes...');
app.use('/api/teacher', teacherRouter);

console.log('✅ Registering student/user routes...');
// Change: Replace ClerkExpressRequireAuth() with requireAuth()
// NOTE: By default, requireAuth() now REDIRECTS unauthenticated users. 
// If you want the old error-throwing behavior, you'll need a custom middleware 
// (see Clerk docs, but this is the standard new usage).
app.use('/api/user', requireAuth(), userRoutes);

console.log('✅ Registering assessment routes...');
app.use('/api/assessments', assessmentRoutes); 

console.log('✅ Registering admin routes...');
app.use('/api/admin', adminRoutes); // 🛑 NEW ROUTE MOUNT 🛑

// Global error handler
app.use((err, req, res, next) => {
    console.error('💥 Error:', err);
    // Clerk errors now have an httpStatus property
    if (err?.clerkError || err?.httpStatus) { 
        const status = err.httpStatus || err.statusCode || 401;
        // This should catch the error thrown by requireAuth() and return 401
        return res.status(status).json({ message: err.message || 'Unauthorized' });
    }
    res.status(500).json({ message: 'Internal Server Error' });
});

// Root
app.get('/', (req, res) => {
    res.send('Prime Mentor Backend API is running!');
});

// Start server
app.listen(PORT, () => console.log(`✅ Server started on http://localhost:${PORT}`));
