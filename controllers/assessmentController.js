// backend/controllers/assessmentController.js
import Assessment from '../models/AssessmentModel.js';
import asyncHandler from 'express-async-handler';

// @desc    Save the complete data from the pricing flow
// @route   POST /api/assessments/submit
// @access  Public
const submitAssessmentFlow = asyncHandler(async (req, res) => {
    // Note: The frontend is sending the raw fields from the finalData object.
    const { 
        classRange, role, year, subject, needs, state, contactNumber,
        studentFirstName, studentLastName, studentEmail,
        parentFirstName, parentLastName, parentEmail,
    } = req.body;

    // Comprehensive validation for all required fields
    if (!classRange || !role || !year || !subject || !needs || !state || !contactNumber) {
        res.status(400);
        throw new Error('Missing core required fields for database submission.');
    }
    
    // Additional validation for student/parent details based on who filled the form
    if (role === 'student' && (!studentFirstName || !studentEmail)) {
         res.status(400);
         throw new Error('Missing student contact details.');
    }
    if (role === 'parent' && (!parentFirstName || !parentEmail)) {
         res.status(400);
         throw new Error('Missing parent contact details.');
    }

    try {
        const newAssessment = await Assessment.create({
            classRange, 
            role, 
            year, 
            subject, 
            needs, 
            state, 
            contactNumber,
            studentFirstName: studentFirstName || 'N/A',
            studentLastName: studentLastName || 'N/A',
            studentEmail: studentEmail || 'N/A',
            parentFirstName: parentFirstName || 'N/A',
            parentLastName: parentLastName || 'N/A',
            parentEmail: parentEmail || 'N/A',
        });

        res.status(201).json({ 
            message: 'Assessment flow data saved successfully for admin panel.',
            data: newAssessment
        });

    } catch (error) {
        console.error('Error saving assessment request to database:', error);
        res.status(500).json({ message: 'Server error saving request to database.' });
    }
});

export { submitAssessmentFlow };