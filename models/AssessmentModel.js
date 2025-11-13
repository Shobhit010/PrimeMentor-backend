// backend/models/AssessmentModel.js
import mongoose from 'mongoose';

const assessmentSchema = mongoose.Schema(
    {
        // Student Details (Required by the form)
        studentFirstName: { type: String, required: true },
        studentLastName: { type: String, required: true },
        studentEmail: { type: String, required: true },

        // Parent/Contact Details (Required by the form)
        parentFirstName: { type: String, required: true },
        parentLastName: { type: String, required: true },
        parentEmail: { type: String, required: true },
        contactNumber: { type: String, required: true },
        
        // Assessment Focus (Required by the form)
        subject: { type: String, required: true },
        class: { type: Number, required: true }, 

        // Admin Tracking
        status: { 
            type: String, 
            enum: ['New', 'Contacted', 'Scheduled', 'Completed', 'Canceled'],
            default: 'New' 
        },
        adminNotes: { type: String, default: '' },
    },
    {
        timestamps: true,
    }
);

const Assessment = mongoose.model('Assessment', assessmentSchema);

export default Assessment;