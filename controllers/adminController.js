// backend/controllers/adminController.js

import asyncHandler from 'express-async-handler';
import User from '../models/UserModel.js';
import TeacherModel from '../models/TeacherModel.js';
import ClassRequest from '../models/ClassRequest.js'; 
import generateToken from '../utils/generateToken.js'; 

// --- Hardcoded Admin Credentials (Matching Frontend) ---
const HARDCODED_ADMIN_EMAIL = 'shobhit2004poddar@gmail.com';
const HARDCODED_ADMIN_PASSWORD = 'Shobhit@007';
const DUMMY_ADMIN_ID = 'admin_root_id'; 

// 🛑 NEW FUNCTION: deleteTeacherById 🛑
// @desc    Delete a teacher by ID
// @route   DELETE /api/admin/teacher/:id
// @access  Private (Admin Only)
export const deleteTeacherById = asyncHandler(async (req, res) => {
    const teacherId = req.params.id;

    // Find and delete the teacher record
    const result = await TeacherModel.findByIdAndDelete(teacherId);

    if (!result) {
        res.status(404);
        throw new Error('Teacher not found or already deleted.');
    }

    res.json({ message: `Teacher with ID ${teacherId} deleted successfully.` });
});


// @desc    Authenticate admin user and get token
// @route   POST /api/admin/login
// @access  Public (unprotected)
export const adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check against hardcoded credentials
    if (email === HARDCODED_ADMIN_EMAIL && password === HARDCODED_ADMIN_PASSWORD) {
        // Successful login: Generate a token for future requests
        const token = generateToken(DUMMY_ADMIN_ID); 

        res.json({
            message: 'Admin login successful',
            token: token,
            adminId: DUMMY_ADMIN_ID,
        });
    } else {
        res.status(401); // Unauthorized
        throw new Error('Invalid email or password for Admin access.');
    }
});


// @desc    Get all students with their course details (KEEP AS IS)
// @route   GET /api/admin/students
// @access  Private (Admin Only)
export const getAllStudents = asyncHandler(async (req, res) => {
    // Retrieve all User records. 
    // Select specific student fields, including embedded courses.
    const students = await User.find({}).select('clerkId studentName email courses createdAt');

    res.json(students);
});

// @desc    Get all teachers for the Admin Table View
// @route   GET /api/admin/teachers
// @access  Private (Admin Only)
export const getAllTeachers = asyncHandler(async (req, res) => {
    // ✅ FIX 2: Set anti-caching headers to force a full response (200 OK) every time.
    // This prevents Express/Node from automatically comparing ETag/If-None-Match headers.
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0'); 
    
    const teachers = await TeacherModel.find({}).select('_id name email mobileNumber subject image createdAt status'); 

    res.json(teachers);
});


// @desc    Get a single teacher's full details (including sensitive info)
// @route   GET /api/admin/teacher/:id
// @access  Private (Admin Only)
export const getTeacherDetailsById = asyncHandler(async (req, res) => {
    const teacherId = req.params.id;

    // Fetch the full teacher record (excluding password)
    const teacher = await TeacherModel.findById(teacherId).select('-password'); 

    if (!teacher) {
        res.status(404);
        throw new Error('Teacher not found.');
    }

    res.json(teacher);
});


// @desc    Get syllabus information (Placeholder) (KEEP AS IS)
// @route   GET /api/admin/syllabus
// @access  Private (Admin Only)
export const getSyllabus = asyncHandler(async (req, res) => {
    // Placeholder logic for Syllabus Management
    const syllabusData = [
        { id: 's1', subject: 'Mathematics', grades: 'Year 7-12', alignment: 'VCAA', activeCourses: 4 },
        { id: 's2', subject: 'Science', grades: 'Year 5-10', alignment: 'NESA', activeCourses: 6 },
        { id: 's3', subject: 'English', grades: 'Year 7-12', alignment: 'NESA', activeCourses: 3 }
    ];

    res.json(syllabusData);
});

// --- NEW FUNCTIONALITY FOR ADMIN CLASS REQUESTS ---

// @desc    Get all pending class requests for Admin to review
// @route   GET /api/admin/pending-requests
// @access  Private (Admin Only)
export const getPendingClassRequests = asyncHandler(async (req, res) => {
    const requests = await ClassRequest.find({ status: 'pending' })
        .sort({ enrollmentDate: 1 })
        .lean();

    res.json(requests);
});

// @desc    Admin approves a request and assigns a teacher
// @route   PUT /api/admin/assign-teacher/:requestId
// @access  Private (Admin Only)
export const assignTeacher = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { teacherId } = req.body; 

    if (!teacherId) {
        res.status(400);
        throw new Error('Teacher ID is required for assignment.');
    }

    // 1. Find and validate the request and teacher
    const request = await ClassRequest.findById(requestId);
    const teacher = await TeacherModel.findById(teacherId).select('name');
    
    // We check for 'pending' here, which means the Admin needs a new view for 'accepted' classes to add the link
    if (!request || !teacher || request.status !== 'pending') {
        res.status(404);
        throw new Error('Class Request, Teacher not found, or Request already processed.');
    }

    // 2. Update the ClassRequest with the assigned teacher and status
    // Note: The status is changed to 'accepted' which means it's ready for the zoom link.
    const updatedRequest = await ClassRequest.findByIdAndUpdate(
        requestId,
        { teacherId: teacherId, status: 'accepted' },
        { new: true, runValidators: false } 
    );

    if (!updatedRequest) {
        res.status(500);
        throw new Error('Failed to update class request status.');
    }

    // 3. Update the Student's course entry
    const student = await User.findOne({ clerkId: request.studentId });

    if (student) {
        // Find the course based on the course name and pending status, or a robust unique identifier if available.
        const courseIndex = student.courses.findIndex(c => 
            c.name === request.courseTitle && c.status === 'pending'
        );

        if (courseIndex !== -1) {
            try {
                student.courses[courseIndex].teacher = teacher.name; 
                student.courses[courseIndex].status = 'active'; 
                
                // CRITICAL: Update the zoomMeetingUrl in the Student's course if it's been manually added to the ClassRequest (though it's unlikely to be present at this stage).
                // The next controller (addZoomLink) will handle the final update.
                // student.courses[courseIndex].zoomMeetingUrl = request.zoomMeetingLink || student.courses[courseIndex].zoomMeetingUrl;

                student.markModified('courses'); 
                await student.save();

            } catch (studentSaveError) {
                console.error(`Error saving student ${student.studentName} course update:`, studentSaveError);
            }
        } else {
            console.warn(`Could not find pending course for student ${student.studentName} with title ${request.courseTitle}`);
        }
    } else {
        console.error(`Student with Clerk ID ${request.studentId} not found.`);
    }

    res.json({ 
        message: 'Teacher assigned and class request approved successfully.', 
        request: updatedRequest, 
        assignedTeacherName: teacher.name 
    });
});


// 🛑 NEW FUNCTION: addZoomLink 🛑
// @desc    Admin manually adds a Zoom link to an 'accepted' class request
// @route   PUT /api/admin/add-zoom-link/:requestId
// @access  Private (Admin Only)
export const addZoomLink = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { zoomMeetingLink } = req.body;

    if (!zoomMeetingLink) {
        res.status(400);
        throw new Error('Zoom Meeting Link is required.');
    }
    
    // 1. Find the ClassRequest
    const request = await ClassRequest.findById(requestId);

    if (!request || request.status !== 'accepted') {
        res.status(404);
        throw new Error(`Class Request not found or not in 'accepted' status.`);
    }

    // 2. Update the ClassRequest with the Zoom link
    request.zoomMeetingLink = zoomMeetingLink;
    const updatedRequest = await request.save();

    // 3. Update the Student's corresponding course entry (CRITICAL STEP)
    const student = await User.findOne({ clerkId: request.studentId });

    if (student) {
        // Find the course based on the course name and active status
        const courseIndex = student.courses.findIndex(c => 
            c.name === request.courseTitle && c.status === 'active'
        );

        if (courseIndex !== -1) {
            try {
                // Update the zoomMeetingUrl in the Student's course
                student.courses[courseIndex].zoomMeetingUrl = zoomMeetingLink;
                student.markModified('courses'); 
                await student.save();
            } catch (studentSaveError) {
                console.error(`Error saving student ${student.studentName} course update with Zoom link:`, studentSaveError);
            }
        } else {
            console.warn(`Could not find active course for student ${student.studentName} with title ${request.courseTitle} to update Zoom link.`);
        }
    }

    res.json({
        message: 'Zoom meeting link added successfully.',
        request: updatedRequest,
    });
});

// 🛑 NEW FUNCTION: getAcceptedClassRequests
export const getAcceptedClassRequests = asyncHandler(async (req, res) => {
    const requests = await ClassRequest.find({ status: 'accepted' })
        .populate('teacherId', 'name email') 
        .sort({ enrollmentDate: 1 })
        .lean();

    res.json(requests);
});