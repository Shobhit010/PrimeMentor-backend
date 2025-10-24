// backend/routes/userRoutes.js

import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getUserCourses, createBooking } from '../controllers/userController.js'; 

const userRouter = express.Router();

userRouter.post('/book', protect, createBooking);
userRouter.get('/courses', protect, getUserCourses); 

export default userRouter;