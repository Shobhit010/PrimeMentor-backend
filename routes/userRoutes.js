// backend/routes/userRoutes.js

import express from 'express';
// REMOVE: import { protect } from '../middlewares/authMiddleware.js';
import { getUserCourses, createBooking } from '../controllers/userController.js'; 

const userRouter = express.Router();

// The 'protect' middleware is now redundant because 
// the entire userRouter is guarded by requireAuth() in server.js.
// The user ID (req.auth.userId) will be available in the controller.
userRouter.post('/book', createBooking);
userRouter.get('/courses', getUserCourses); 

export default userRouter;