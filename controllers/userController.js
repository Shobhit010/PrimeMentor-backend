// backend/controllers/userController.js

import asyncHandler from 'express-async-handler';
import User from '../models/UserModel.js'; 
import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import ClassRequest from '../models/ClassRequest.js';
import TeacherModel from '../models/TeacherModel.js';

dotenv.config();

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

const getOAuthToken = async () => {
    const tokenUrl = 'https://zoom.us/oauth/token';
    const authString = `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`; 
    const authHeader = Buffer.from(authString).toString('base64');

    const params = new URLSearchParams();
    params.append('grant_type', 'account_credentials');
    params.append('account_id', ZOOM_ACCOUNT_ID);

    try {
        const response = await axios.post(tokenUrl, params.toString(), {
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Zoom OAuth Token Error:', error.response ? error.response.data : error.message);
        throw new Error('Failed to obtain Zoom OAuth Token.');
    }
};

const createZoomMeeting = async (topic, preferredDate, preferredTime) => {
    try {
        const accessToken = await getOAuthToken();
        
        const dateOnly = preferredDate.substring(0, 10);
        const date = new Date(dateOnly);

        const lowerCaseTime = preferredTime.toLowerCase();
        
        // This regex is slightly safer than simple split() for time parsing
        const timeParts = lowerCaseTime.match(/(\d{1,2}:\d{2})(am|pm)/); 
        
        if (!timeParts) {
             console.error('Time parsing failed for:', preferredTime);
             throw new Error('Invalid time format received for Zoom meeting.');
        }

        const startTimeStr = timeParts[1]; 
        const period = timeParts[2];       

        let [hour, minute] = startTimeStr.split(':').map(s => parseInt(s.trim()));
        
        let adjustedHour = hour;
        if (period === 'pm' && hour !== 12) {
            adjustedHour += 12;
        }
        if (period === 'am' && hour === 12) {
            adjustedHour = 0;
        }

        date.setHours(adjustedHour, minute, 0, 0);

        const meetingStartTime = date;
        const createMeetingUrl = `https://api.zoom.us/v2/users/${ZOOM_ACCOUNT_ID}/meetings`;
        const meetingDetails = {
            topic: topic,
            type: 2,
            start_time: meetingStartTime.toISOString(),
            duration: 60,
            settings: {
                host_video: true,
                participant_video: true,
                join_before_host: true,
            },
        };

        const response = await axios.post(createMeetingUrl, meetingDetails, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.data && response.data.join_url) {
            console.log(`Successfully created Zoom meeting: ${response.data.join_url}`);
            return response.data.join_url;
        } else {
            throw new Error('Zoom API did not return a join URL.');
        }

    } catch (error) {
        console.error('Error creating Zoom meeting:', error.response ? error.response.data : error.message);
        return 'https://zoom.us/j/fallback_dummy_meeting_url';
    }
};

export const createBooking = asyncHandler(async (req, res) => {
    const studentClerkId = req.auth.userId;
    const { courseDetails, scheduleDetails, studentDetails, guardianDetails } = req.body;
    const { 
        purchaseType, 
        preferredDate, 
        preferredTime, 
        preferredWeekStart, 
        preferredTimeMonFri, 
        preferredTimeSaturday,
        postcode,
        numberOfSessions // Assuming this is present for Starter Pack (6)
    } = scheduleDetails;

    try {
        let student = await User.findOne({ clerkId: studentClerkId }); 
        
        if (!student) {
            const nameToUse = studentDetails?.first && studentDetails?.last 
                ? `${studentDetails.first} ${studentDetails.last}`
                : "New Student"; 
            
            const emailToUse = studentDetails?.email || guardianDetails?.email || 'unknown@example.com';

            student = await User.create({ 
                clerkId: studentClerkId, 
                studentName: nameToUse,
                email: emailToUse, 
                courses: [], 
            });
        }
        
        const courseExists = student.courses.some(c => c.name === courseDetails.courseTitle);
        if (courseExists) {
            return res.status(409).json({ success: false, message: 'You have already enrolled in this course.' });
        }

        const teachers = await TeacherModel.find({});
        if (teachers.length === 0) {
            return res.status(500).json({ success: false, message: "No teachers available to assign." });
        }
        const randomTeacher = teachers[Math.floor(Math.random() * teachers.length)];

        const isTrial = purchaseType === 'TRIAL';
        
        const finalPreferredDate = isTrial ? preferredDate : preferredWeekStart; 
        const finalPreferredTime = isTrial ? preferredTime : preferredTimeMonFri; 

        if (!finalPreferredDate || !finalPreferredTime) {
             return res.status(400).json({ success: false, message: "Missing preferred date or time details for the booking." });
        }
        
        // --- 1. Save Class Request (Pending) ---
        const newRequest = new ClassRequest({
            courseId: courseDetails.courseId,
            courseTitle: courseDetails.courseTitle,
            studentId: studentClerkId,
            studentName: student.studentName, 
            teacherId: randomTeacher._id,
            scheduleTime: finalPreferredTime, 
            preferredDate: finalPreferredDate,
            preferredTimeMonFri: preferredTimeMonFri, 
            preferredTimeSaturday: preferredTimeSaturday,
            postcode: postcode, 
            purchaseType: purchaseType, 
            status: 'pending'
        });
        await newRequest.save();

        // --- 2. Create Zoom Meeting (for the first session/trial) ---
        const zoomMeetingUrl = await createZoomMeeting(
            courseDetails.courseTitle,
            finalPreferredDate,
            finalPreferredTime
        );
        
        // --- 3. Add Course to Student ---
        const newCourse = {
            name: courseDetails.courseTitle,
            description: isTrial ? `Trial session for ${courseDetails.courseTitle}` : `6-Session Starter Pack for ${courseDetails.courseTitle}`, 
            teacher: randomTeacher.name,
            duration: isTrial ? '1 hour trial' : '6 sessions total',
            preferredDate: finalPreferredDate, 
            preferredTime: finalPreferredTime, 
            status: 'pending',
            enrollmentDate: new Date(),
            zoomMeetingUrl: zoomMeetingUrl,
            // 🛑 SAVING WEEKLY FIELDS AND REMAINING SESSIONS 🛑
            preferredTimeMonFri: isTrial ? null : preferredTimeMonFri,
            preferredTimeSaturday: isTrial ? null : preferredTimeSaturday,
            sessionsRemaining: isTrial ? 1 : numberOfSessions, 
        };
        student.courses.push(newCourse);
        await student.save();

        res.status(201).json({ 
            success: true, 
            message: 'Booking and request created successfully!', 
            course: newCourse 
        });

    } catch (error) {
        console.error('Error creating booking:', error);
        if (error.message.includes("preferred date or time")) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Server error during booking. Please check server logs for details.' });
    }
});

export const getUserCourses = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    let user = await User.findOne({ clerkId });

    if (!user) {
        user = await User.create({ clerkId, courses: [] }); 
        return res.status(200).json({ courses: [] });
    }

    res.status(200).json({ courses: user.courses });
});