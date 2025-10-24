import mongoose from 'mongoose';

const assessmentSchema = mongoose.Schema(
    {
        // Data from the new flow steps
        classRange: { type: String, required: true }, // e.g., '2-6'
        role: { type: String, required: true }, // 'parent' or 'student'
        year: { type: Number, required: true }, // e.g., 6, 7, 12
        subject: { type: String, required: true },
        needs: { type: String, required: true }, // from StepNeeds
        state: { type: String, required: true },
        contactNumber: { type: String, required: true },
        
        // Final collected student/parent details
        studentFirstName: { type: String, required: true },
        studentLastName: { type: String, required: true },
        studentEmail: { type: String, required: true },
        parentFirstName: { type: String, required: true },
        parentLastName: { type: String, required: true },
        parentEmail: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

const Assessment = mongoose.model('Assessment', assessmentSchema);

export default Assessment;