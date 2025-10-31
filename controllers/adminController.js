// backend/controllers/adminController.js

import asyncHandler from 'express-async-handler';
import User from '../models/UserModel.js';
import TeacherModel from '../models/TeacherModel.js';

// @desc    Get all students with their course details
// @route   GET /api/admin/students
// @access  Private (Admin Only)
export const getAllStudents = asyncHandler(async (req, res) => {
    // Retrieve all User records. 
    // Select specific student fields, including embedded courses.
    const students = await User.find({}).select('clerkId studentName email courses createdAt');

    res.json(students);
});

// @desc    Get all teachers
// @route   GET /api/admin/teachers
// @access  Private (Admin Only)
export const getAllTeachers = asyncHandler(async (req, res) => {
    // Fetch all Teacher records.
    const teachers = await TeacherModel.find({}).select('name email subject createdAt'); 

    res.json(teachers);
});

// @desc    Get syllabus information (Placeholder)
// @route   GET /api/admin/syllabus
// @access  Private (Admin Only)
export const getSyllabus = asyncHandler(async (req, res) => {
    // Placeholder logic for Syllabus Management
    const syllabusData = [
        { id: 's1', subject: 'Mathematics', grades: 'Year 7-12', alignment: 'VCAA', activeCourses: 4 },
        { id: 's2', subject: 'Science', grades: 'Year 5-10', alignment: 'NESA', activeCourses: 6 },
        { id: 's3', subject: 'English', grades: 'Year 7-12', alignment: 'NESA', activeCourses: 3 }
    ];

    res.json(syllabusData);
});
