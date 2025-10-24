import express from 'express';
import { submitAssessmentFlow } from '../controllers/assessmentController.js';

const router = express.Router();

// @route POST /api/assessments/submit
// @desc Save new assessment request data to the database
// @access Public (as Clerk auth is not strictly required to complete the flow, only to book)
router.post('/submit', submitAssessmentFlow);

export default router;