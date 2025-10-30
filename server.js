// backend/server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import teacherRouter from './routes/teacherRoutes.js';
import userRoutes from './routes/userRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js'; 
// REMOVE: import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
// ADD:
import { clerkMiddleware, requireAuth } from '@clerk/express';

dotenv.config();

// ... (Environment Variable Validations remain the same) ...

// Express
const app = express();
const PORT = process.env.PORT || 5000;

// ... (CORS configuration remains the same) ...

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