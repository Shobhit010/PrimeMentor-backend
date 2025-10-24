// backend/utils/zoomIntegration.js
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const {
    ZOOM_CLIENT_ID,
    ZOOM_CLIENT_SECRET,
    ZOOM_ACCOUNT_ID,
    ZOOM_HOST_EMAIL // Assume a licensed host email for Server-to-Server meetings
} = process.env;

// 1. Function to get the Server-to-Server OAuth Access Token
const getZoomAccessToken = async () => {
    const authString = `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`;
    const base64Auth = Buffer.from(authString).toString('base64');

    try {
        const response = await axios.post(
            'https://zoom.us/oauth/token',
            `grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
            {
                headers: {
                    'Authorization': `Basic ${base64Auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        // The token is valid for 1 hour (3600 seconds)
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching Zoom Access Token:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with Zoom');
    }
};

// 2. Function to create the Zoom Meeting
/**
 * Creates a scheduled Zoom meeting and returns the join/start URLs.
 * @param {string} topic - The meeting topic (e.g., "Math Class - Algebra I").
 * @param {Date} startTime - The meeting start time.
 * @param {number} duration - The duration in minutes.
 * @returns {object} { meetingId, joinUrl, startUrl }
 */
export const createZoomMeeting = async (topic, startTime, duration) => {
    const accessToken = await getZoomAccessToken();

    // Use a fixed host email associated with your licensed Zoom account
    // This host needs to be defined in your .env or configuration.
    const hostEmail = 'your.licensed.host@example.com'; 
    
    // Zoom time must be in ISO 8601 format
    const start_time_iso = startTime.toISOString().slice(0, 19) + 'Z'; 

    const meetingDetails = {
        topic: topic,
        type: 2, // Scheduled meeting
        start_time: start_time_iso,
        duration: duration, // in minutes
        timezone: 'Asia/Kolkata', // Set to your desired timezone (IST)
        password: Math.random().toString(36).substring(2, 8).toUpperCase(), // Random 6-char password
        settings: {
            host_video: true,
            participant_video: true,
            jbh_time: 5, // Join before host time in minutes
            enforce_login: false,
            waiting_room: true,
        },
    };

    try {
        const response = await axios.post(
            `https://api.zoom.us/v2/users/${hostEmail}/meetings`,
            meetingDetails,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const { id, join_url, start_url } = response.data;

        return {
            meetingId: id,
            joinUrl: join_url,
            startUrl: start_url,
        };
    } catch (error) {
        console.error('Error creating Zoom meeting:', error.response?.data || error.message);
        throw new Error('Failed to create Zoom meeting.');
    }
};
