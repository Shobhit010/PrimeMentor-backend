import express from 'express';
import upload from '../config/multer.js';
import {
  registerTeacher,
  loginTeacher,
  createClassRequest,
  getClassRequests,
  getManagedClasses,
  acceptClassRequest
} from '../controllers/teacherController.js';
import { protectTeacher } from '../middlewares/authTeacherMiddleware.js';

const router = express.Router();

router.get('/test', (req, res) => res.send('✅ Teacher route is working'));

// Auth routes
router.post('/register', upload.single('image'), registerTeacher);
router.post('/login', loginTeacher);

// Protected teacher routes
router.get('/class-requests', protectTeacher, getClassRequests);
router.put('/class-requests/:id/accept', protectTeacher, acceptClassRequest);
router.get('/managed-classes', protectTeacher, getManagedClasses);

// Public student route
router.post('/create-request', createClassRequest);

export default router;
