// backend/controllers/userController.js

import asyncHandler from 'express-async-handler';
import User from '../models/UserModel.js'; 
import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import ClassRequest from '../models/ClassRequest.js';
import TeacherModel from '../models/TeacherModel.js';
import { clerkClient } from '@clerk/clerk-sdk-node'; 


dotenv.config();

export const createBooking = asyncHandler(async (req, res) => {
    console.log(req.body.scheduleDetails);
    const studentClerkId = req.auth().userId; 
    const { courseDetails, scheduleDetails, studentDetails, guardianDetails } = req.body;
    const { 
        purchaseType, 
        preferredDate, // Trial date (now a "YYYY-MM-DD" string from frontend)
        preferredTime, // Trial time
        preferredWeekStart, // Starter pack start date
        preferredTimeMonFri, // Starter pack weekday time
        preferredTimeSaturday, // Starter pack Saturday time
        postcode,
        numberOfSessions 
    } = scheduleDetails;

    try {
        // --- User Lookup/Creation Logic (No Change) ---
        const nameToUse = studentDetails?.first && studentDetails?.last 
            ? `${studentDetails.first} ${studentDetails.last}`
            : "New Student"; 
        
        let emailToUse = studentDetails?.email || guardianDetails?.email; 

        if (!emailToUse) {
            const clerkUser = await clerkClient.users.getUser(studentClerkId);
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
        // These will be the YYYY-MM-DD strings.
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
            
            // 🛑 FIX: Ensure only the clean date string (YYYY-MM-DD) is saved for Trial
            // For Trial, use preferredDate string (from FE payload)
            // For StarterPack, use preferredWeekStart string (from FE payload)
            preferredDate: isTrial ? preferredDate : preferredWeekStart, 
            scheduleTime: preferredTime, // Trial time
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
            
            // 🛑 FIX: Store the fixed string here as well
            preferredDate: initialPreferredDate, // Date of the *first* session (the fixed YYYY-MM-DD string)
            preferredTime: initialPreferredTime, // Time of the *first* session
            
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
    const clerkId = req.auth().userId; 
    
    try {
        const clerkUser = await clerkClient.users.getUser(clerkId);
        
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