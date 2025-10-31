// backend/routes/adminRoutes.js

import express from 'express';
import { 
    getAllStudents, 
    getAllTeachers, 
    getSyllabus 
} from '../controllers/adminController.js';
// We'll assume any requests hitting /api/admin are already authenticated,
// but we'll use a basic admin email check in a middleware for security.
import { adminOnlyMiddleware } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// 🛑 All Admin routes MUST be protected by the admin-only check. 🛑
router.use(adminOnlyMiddleware);

router.get('/students', getAllStudents);
router.get('/teachers', getAllTeachers);
router.get('/syllabus', getSyllabus);

export default router;