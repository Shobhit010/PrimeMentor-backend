// backend/routes/adminRoutes.js

import express from 'express';
import { 
    getAllStudents, 
    getAllTeachers, 
    getSyllabus,
    getPendingClassRequests, 
    assignTeacher,
    adminLogin,
    getTeacherDetailsById,
    deleteTeacherById,
    addZoomLink,
    getAcceptedClassRequests // 🛑 CRITICAL IMPORT
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
router.get('/teacher/:id', getTeacherDetailsById);
router.delete('/teacher/:id', deleteTeacherById);

router.get('/syllabus', getSyllabus);

// --- Class Request Routes (Protected) ---
router.get('/pending-requests', getPendingClassRequests); 
router.put('/assign-teacher/:requestId', assignTeacher); 
router.put('/add-zoom-link/:requestId', addZoomLink); 

// 🛑 NEW ROUTE: Fetch Accepted Classes 🛑
router.get('/accepted-requests', getAcceptedClassRequests); 

export default router;