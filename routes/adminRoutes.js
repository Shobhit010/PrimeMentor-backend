// backend/routes/adminRoutes.js

import express from 'express';
import { 
    getAllStudents, 
    getAllTeachers, 
    getSyllabus,
    getPendingClassRequests, 
    assignTeacher,
    adminLogin,
    getTeacherDetailsById // NEW IMPORT
} from '../controllers/adminController.js';
import { adminOnlyMiddleware } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// --- PUBLIC ROUTES (No Middleware) ---
router.post('/login', adminLogin);

// 🛑 All Admin routes MUST be protected by the admin-only check. 🛑
router.use(adminOnlyMiddleware);

router.get('/students', getAllStudents);

// Teacher routes
router.get('/teachers', getAllTeachers);
router.get('/teacher/:id', getTeacherDetailsById); // NEW ROUTE

router.get('/syllabus', getSyllabus);

// --- NEW ADMIN ROUTES (Protected) ---
router.get('/pending-requests', getPendingClassRequests); 
router.put('/assign-teacher/:requestId', assignTeacher); 

export default router;