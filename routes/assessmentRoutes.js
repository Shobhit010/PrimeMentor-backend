// backend/routes/assessmentRoutes.js
import express from 'express';
import { submitAssessmentRequest, getAllAssessments } from '../controllers/assessmentController.js';
import { adminOnlyMiddleware } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// @route POST /api/assessments/submit
// @desc Save new assessment request data to the database
// @access Public (For the public-facing modal)
router.post('/submit', submitAssessmentRequest);

// @route GET /api/assessments
// @desc Get all assessment requests (Admin dashboard)
// @access Private (Admin Only)
router.get('/', adminOnlyMiddleware, getAllAssessments); // Protected by middleware

export default router;