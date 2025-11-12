// backend/server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import teacherRouter from './routes/teacherRoutes.js';
import userRoutes from './routes/userRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js'; 
import adminRoutes from './routes/adminRoutes.js'; 
import { clerkMiddleware } from '@clerk/express'; // requireAuth is no longer imported/used here

dotenv.config();

// ... (Environment Variable Validations remain the same) ...

// Express
const app = express();
const PORT = process.env.PORT || 5000;

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://primementor.com.au'; 
const allowedOrigins = [
    'http://localhost:5173', // Local development
    FRONTEND_URL, 
    `https://www.${FRONTEND_URL.replace(/https?:\/\//, '')}`
];

app.use(cors({
    origin: function (origin, callback) {
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
// 🛑 CRITICAL FIX: Removed requireAuth() from route mounting. 
// Authentication is now handled manually inside the controller.
app.use('/api/user', userRoutes);

console.log('✅ Registering assessment routes...');
app.use('/api/assessments', assessmentRoutes); 

console.log('✅ Registering admin routes...');
app.use('/api/admin', adminRoutes); 

// Global error handler
app.use((err, req, res, next) => {
    console.error('💥 Error:', err);
    // Clerk errors now have an httpStatus property
    if (err?.clerkError || err?.httpStatus) { 
        const status = err.httpStatus || err.statusCode || 401;
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