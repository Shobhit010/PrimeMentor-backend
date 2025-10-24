import mongoose from "mongoose";

const classRequestSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    courseTitle: { type: String, required: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    scheduleTime: { type: String },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    preferredDate: { type: Date },
    enrollmentDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

classRequestSchema.index({ teacherId: 1, status: 1 });

const ClassRequest = mongoose.models.ClassRequest || mongoose.model("ClassRequest", classRequestSchema);
export default ClassRequest;
