import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    // The unique ID provided by Clerk
    clerkId: {
        type: String,
        required: true,
        unique: true,
    },
    // Array to store the user's courses
    courses: [
        {
            name: {
                type: String,
                required: true,
            },
            description: {
                type: String,
                required: true,
            },
            teacher: {
                type: String,
                required: true,
            },
            duration: {
                type: String,
                required: true,
            },
            progress: {
                type: Number,
                default: 0,
            },
            preferredDate: {
                type: Date,
                required: false,
            },
            preferredTime: {
                type: String,
                required: false,
            },
            // NEW: Field to store the Zoom meeting URL
            zoomMeetingUrl: {
                type: String,
                required: false,
            },
        },
    ],
    // Add other user fields as needed
    firstName: String,
    email: String,
}, {
    timestamps: true,
});

const User = mongoose.model('User', userSchema);

export default User;