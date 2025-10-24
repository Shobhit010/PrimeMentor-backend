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

        const [startTimeStr] = preferredTime.split(' ');
        let [hour, minute] = startTimeStr.slice(0, -2).split(':').map(Number);
        const period = startTimeStr.slice(-2).toLowerCase();
        
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

export const createBooking = async (req, res) => {
    const studentClerkId = req.auth.userId; 
    const { courseDetails, scheduleDetails } = req.body;

    try {
        const student = await User.findOne({ clerkId: studentClerkId });
        console.log("Student record found:", student);
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found." });
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

        console.log("Course Details Received:", courseDetails);

        const newRequest = new ClassRequest({
            courseId: courseDetails.courseId,
            courseTitle: courseDetails.courseTitle,
            studentId: studentClerkId,
            studentName: student?.studentName || "Unknown Student",
            teacherId: randomTeacher._id,
            scheduleTime: scheduleDetails.preferredTime,
            preferredDate: scheduleDetails.preferredDate,
            status: 'pending'
        });
        await newRequest.save();

        const zoomMeetingUrl = await createZoomMeeting(
            courseDetails.courseTitle,
            scheduleDetails.preferredDate,
            scheduleDetails.preferredTime
        );

        const newCourse = {
            name: courseDetails.courseTitle,
            description: `Trial session for ${courseDetails.courseTitle}`,
            teacher: randomTeacher.name,
            duration: '1 hour trial',
            preferredDate: scheduleDetails.preferredDate,
            preferredTime: scheduleDetails.preferredTime,
            status: 'pending',
            enrollmentDate: new Date(),
            zoomMeetingUrl: zoomMeetingUrl
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
        res.status(500).json({ success: false, message: 'Server error during booking.' });
    }
};

export const getUserCourses = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    console.log(`Fetching courses for user with clerkId: ${clerkId}`);

    let user = await User.findOne({ clerkId });

    if (!user) {
        user = await User.create({ clerkId, courses: [] });
        return res.status(200).json({ courses: [] });
    }
    
    res.status(200).json({ courses: user.courses });
});
