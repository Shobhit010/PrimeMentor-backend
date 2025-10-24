// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import teacherRouter from './routes/teacherRoutes.js';
import userRoutes from './routes/userRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js'; // Import the new route
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

dotenv.config();

// Validate secrets
if (!process.env.JWT_SECRET) {
  console.error('❌ Missing JWT_SECRET in .env');
  process.exit(1);
}
if (!process.env.CLERK_SECRET_KEY) {
  console.error('❌ Missing CLERK_SECRET_KEY in .env');
  process.exit(1);
}
// You'll also need to add your MongoDB URI to the .env file.
if (!process.env.MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in .env');
  process.exit(1);
}


// Express
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
connectDB(); // Ensure this function correctly connects to your MongoDB

// Static uploads
app.use('/images', express.static('uploads'));

// Routes
console.log('✅ Registering teacher routes...');
app.use('/api/teacher', teacherRouter);

console.log('✅ Registering student/user routes...');
app.use('/api/user', ClerkExpressRequireAuth(), userRoutes);

console.log('✅ Registering assessment routes...');
app.use('/api/assessments', assessmentRoutes); // Use the new route

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Error:', err);
  if (err?.clerkError) {
    const status = err.statusCode || 401;
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