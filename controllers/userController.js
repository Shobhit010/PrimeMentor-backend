// backend/controllers/userController.js

import asyncHandler from 'express-async-handler';
import User from '../models/UserModel.js'; 
import axios from 'axios';
import jwt from 'jsonwebtoken'; // 🛑 NEW IMPORT FOR TOKEN DECODING 🛑
import dotenv from 'dotenv';
import ClassRequest from '../models/ClassRequest.js';
import TeacherModel from '../models/TeacherModel.js';
import { clerkClient } from '@clerk/clerk-sdk-node'; 


dotenv.config();

// --- Helper Function to Manually Extract Clerk User ID ---
const getClerkUserIdFromToken = (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return null;
    }
    
    try {
        const decoded = jwt.decode(token);
        // Clerk tokens use 'sub' (subject) to store the user ID
        return decoded?.sub || null; 
    } catch (error) {
        console.error("JWT Decode Error (Clerk Token):", error);
        return null;
    }
}
// --------------------------------------------------------

export const createBooking = asyncHandler(async (req, res) => {
    // 🛑 CRITICAL FIX: Get the user ID manually from the token instead of req.auth()
    const studentClerkId = getClerkUserIdFromToken(req);

    if (!studentClerkId) {
        // 🛑 Send an explicit 401 if authentication fails
        return res.status(401).json({ success: false, message: "Authentication failed. Please log in again." });
    }

    console.log(req.body.scheduleDetails);
    // OLD LINE: const studentClerkId = req.auth().userId; // REMOVED/REPLACED
    const { courseDetails, scheduleDetails, studentDetails, guardianDetails } = req.body;
    const { 
        purchaseType, 
        preferredDate, 
        preferredTime, 
        preferredWeekStart, 
        preferredTimeMonFri, 
        preferredTimeSaturday, 
        postcode,
        numberOfSessions 
    } = scheduleDetails;

    try {
        // --- User Lookup/Creation Logic (uses studentClerkId) ---
        const nameToUse = studentDetails?.first && studentDetails?.last 
            ? `${studentDetails.first} ${studentDetails.last}`
            : "New Student"; 
        
        let emailToUse = studentDetails?.email || guardianDetails?.email; 

        // Safely fetch Clerk user details
        let clerkUser;
        try {
            clerkUser = await clerkClient.users.getUser(studentClerkId);
        } catch (clerkError) {
            console.error('Clerk User Lookup Failed during booking:', clerkError);
            // Fallback email if Clerk lookup fails
            if (!emailToUse) {
                emailToUse = 'unknown_clerk_failure@example.com';
            }
        }
        
        if (!emailToUse && clerkUser) {
            emailToUse = clerkUser?.emailAddresses[0]?.emailAddress || 'unknown@example.com';
        }
        
        let student = await User.findOneAndUpdate(
            { clerkId: studentClerkId },
            { 
                $set: { 
                    email: emailToUse, 
                    studentName: nameToUse,
                    guardianEmail: guardianDetails?.email,
                    guardianPhone: guardianDetails?.phone 
                }
            },
            { 
                new: true, 
                upsert: true, 
                setDefaultsOnInsert: true 
            }
        );
        
        const courseExists = student.courses.some(c => c.name === courseDetails.courseTitle);
        if (courseExists) {
            return res.status(409).json({ success: false, message: 'You have already enrolled in this course.' });
        }

        const isTrial = purchaseType === 'TRIAL';
        
        // --- CRITICAL DATE LOGIC ---
        const initialPreferredDate = isTrial ? preferredDate : preferredWeekStart; 
        const initialPreferredTime = isTrial ? preferredTime : preferredTimeMonFri; 
        
        if (!initialPreferredDate || !initialPreferredTime) {
             return res.status(400).json({ success: false, message: "Missing preferred date or time details for the booking." });
        }
        // --- END CRITICAL DATE LOGIC ---
        
        // --- 1. Save Class Request (Pending for Admin) ---
        const newRequest = new ClassRequest({
            courseId: courseDetails.courseId,
            courseTitle: courseDetails.courseTitle,
            studentId: studentClerkId,
            studentName: student.studentName, 
            purchaseType: purchaseType,
            preferredDate: isTrial ? preferredDate : preferredWeekStart, 
            scheduleTime: preferredTime, 
            preferredTimeMonFri: preferredTimeMonFri,
            preferredTimeSaturday: preferredTimeSaturday,
            postcode: postcode, 
            status: 'pending',
            subject: courseDetails.subject || 'N/A', 
            zoomMeetingLink: '' 
        });
        await newRequest.save();
        console.log('Saved ClassRequest preferredDate:', newRequest.preferredDate);

        // --- 2. *Removed* Create Zoom Meeting - Using a placeholder until admin adds link ---
        const zoomMeetingUrl = ''; // Placeholder

        // --- 3. Add Course to Student (Status: pending) ---
        const newCourse = {
            name: courseDetails.courseTitle,
            description: isTrial ? `Trial session for ${courseDetails.courseTitle}` : `Starter Pack for ${courseDetails.courseTitle}`, 
            teacher: 'Pending Teacher', 
            duration: isTrial ? '1 hour trial' : `${numberOfSessions} sessions total`,
            preferredDate: initialPreferredDate, 
            preferredTime: initialPreferredTime, 
            status: 'pending', 
            enrollmentDate: new Date(),
            zoomMeetingUrl: zoomMeetingUrl, 
            preferredTimeMonFri: isTrial ? null : preferredTimeMonFri,
            preferredTimeSaturday: isTrial ? null : preferredTimeSaturday,
            sessionsRemaining: isTrial ? 1 : numberOfSessions, 
        };
        student.courses.push(newCourse);
        await student.save();

        res.status(201).json({ 
            success: true, 
            message: 'Booking request sent to admin for teacher assignment and Zoom link creation.', 
            course: newCourse 
        });

    } catch (error) {
        console.error('Error creating booking:', error);
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'User already exists with this email address.' });
        }
        if (error.message.includes("preferred date or time")) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Server error during booking. Please check server logs for details.' });
    }
});

// getUserCourses (No Change needed)
export const getUserCourses = asyncHandler(async (req, res) => {
    // 🛑 CRITICAL FIX: Get the user ID manually from the token instead of req.auth()
    const clerkId = getClerkUserIdFromToken(req);

    if (!clerkId) {
        // 🛑 Send an explicit 401 if authentication fails
        return res.status(401).json({ courses: [], message: "Authentication failed. Please log in again." });
    }

    let clerkUser;
    // 🛑 NEW FIX: Explicitly catch errors from Clerk client API calls 🛑
    try {
        clerkUser = await clerkClient.users.getUser(clerkId);
    } catch (error) {
        console.error(`Clerk user lookup failed for ID: ${clerkId}`, error);
        // If Clerk fails, we cannot proceed.
        return res.status(500).json({ courses: [], message: 'Internal Server Error while communicating with authentication service.' });
    }
    
    try {
        
        if (!clerkUser) {
            console.error(`Clerk user not found for ID: ${clerkId}`);
            return res.status(404).json({ courses: [], message: 'User not registered in database. Please log out and back in.' });
        }

        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const studentName = clerkUser.firstName || 'New Student'; 

        if (!email) {
            console.error(`Clerk user ${clerkId} is missing an email address.`);
            return res.status(400).json({ courses: [], message: 'Could not retrieve user email for registration.' });
        }
        
        const user = await User.findOneAndUpdate(
            { clerkId: clerkId },
            { 
                $set: { 
                    email: email, 
                    studentName: studentName 
                }
            },
            { 
                new: true, 
                upsert: true, 
                setDefaultsOnInsert: true 
            }
        );

        res.status(200).json({ courses: user.courses });

    } catch (error) {
        console.error('Error fetching courses:', error);
        if (error.code === 11000) {
            return res.status(409).json({ courses: [], message: 'User data conflict detected. Please contact support.' });
        }
        res.status(500).json({ courses: [], message: 'Internal Server Error while fetching courses.' });
    }
});