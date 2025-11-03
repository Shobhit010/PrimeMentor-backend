// backend/models/ClassRequest.js (UPDATED CODE)
import mongoose from "mongoose";

const classRequestSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    courseTitle: { type: String, required: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },

    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },

    // 🛑 FIX 1: Remove `required: true` from fields that are populated optionally 
    // during creation, or ensure they have a default.
    purchaseType: { type: String, enum: ["TRIAL", "STARTER_PACK"], default: 'TRIAL' }, // Made optional with default
    preferredDate: { type: Date }, 
    scheduleTime: { type: String }, 
    preferredTimeMonFri: { type: String }, 
    preferredTimeSaturday: { type: String }, 
    postcode: { type: String },
    
    subject: { type: String, default: 'Unassigned' }, // Made optional with default

    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },

    enrollmentDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

classRequestSchema.index({ teacherId: 1, status: 1 });
classRequestSchema.index({ status: 1 });

const ClassRequest = mongoose.models.ClassRequest || mongoose.model("ClassRequest", classRequestSchema);
export default ClassRequest;