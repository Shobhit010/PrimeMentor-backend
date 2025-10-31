// backend/models/UserModel.js

import mongoose from 'mongoose';

// --- Sub-Schema for nested Courses array ---
const courseSchema = mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String 
    },
    teacher: { 
        type: String 
    },
    duration: { 
        type: String 
    },
    preferredDate: { // Date of the FIRST session
        type: String 
    },
    preferredTime: { // Time of the FIRST session
        type: String 
    },
    // 🛑 NEW FIELDS FOR WEEKLY SESSIONS 🛑
    preferredTimeMonFri: { 
        type: String,
        default: null
    },
    preferredTimeSaturday: { 
        type: String,
        default: null
    },
    sessionsRemaining: { // Tracks how many sessions are left
        type: Number,
        default: 1
    },
    // 🛑 END OF NEW FIELDS 🛑
    status: { 
        type: String, 
        enum: ['pending', 'active', 'completed'], 
        default: 'pending' 
    },
    enrollmentDate: { 
        type: Date, 
        default: Date.now 
    },
    zoomMeetingUrl: { 
        type: String 
    }
});


// --- Main User Schema ---
const userSchema = mongoose.Schema({
    clerkId: { // Crucial unique identifier from Clerk
        type: String,
        required: true,
        unique: true
    },
    studentName: { 
        type: String,
        default: 'New Student'
    },
    email: { 
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    courses: [courseSchema], 
    guardianEmail: { type: String, trim: true },
    guardianPhone: { type: String } 
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

export default User;