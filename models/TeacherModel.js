import mongoose from 'mongoose';

const teacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // Storing the filename/path of the uploaded image
    image: { type: String, default: '' } 
}, { timestamps: true });

// Export as "Teacher" model. If it already exists, use it.
const TeacherModel = mongoose.models.teacher || mongoose.model("Teacher", teacherSchema);

export default TeacherModel;
