import mongoose from 'mongoose';

const teacherSchema = new mongoose.Schema({
    // Account Info (REQUIRED)
    name: { type: String, required: [true, 'Full name is required.'] },
    email: { type: String, required: [true, 'Email is required.'], unique: true },
    password: { type: String, required: [true, 'Password is required.'] },
    
    // Profile Picture (Technically optional by Mongoose, but mandatory by frontend logic)
    image: { type: String, default: null }, // Store the filename/path
    
    // Personal Information
    address: { type: String, default: null },
    mobileNumber: { type: String, default: null },
    subject: { type: String, default: null }, 

    // Banking Details
    accountHolderName: { type: String, default: null },
    bankName: { type: String, default: null },
    ifscCode: { type: String, default: null },
    accountNumber: { type: String, default: null },

    // Identification Documents
    aadharCard: { type: String, default: null },
    panCard: { type: String, default: null },
    cvFile: { type: String, default: null }, // Store the filename/path of the uploaded CV
    
    // Teacher status (Optional: for Admin approval/review)
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

}, { timestamps: true });

// Export as "Teacher" model. If it already exists, use it.
const TeacherModel = mongoose.models.teacher || mongoose.model("Teacher", teacherSchema);

export default TeacherModel;