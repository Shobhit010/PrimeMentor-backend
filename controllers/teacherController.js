import TeacherModel from '../models/TeacherModel.js';
import UserModel from '../models/UserModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import ClassRequest from '../models/ClassRequest.js';

const createToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// --- Register ---
export const registerTeacher = async (req, res) => {
  const { name, email, password } = req.body;
  const imagePath = req.file ? req.file.filename : '';

  try {
    const exists = await TeacherModel.findOne({ email });
    if (exists) return res.json({ success: false, message: 'Teacher already exists' });
    if (!validator.isEmail(email)) return res.json({ success: false, message: 'Invalid email' });
    if (password.length < 8) return res.json({ success: false, message: 'Password too short' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const teacher = await TeacherModel.create({ name, email, password: hashed, image: imagePath });

    const token = createToken(teacher._id);
    res.json({ success: true, token, teacher: { _id: teacher._id, name: teacher.name, email: teacher.email, image: teacher.image } });
  } catch (err) {
    console.error('Teacher registration error:', err);
    res.json({ success: false, message: 'Server error during registration' });
  }
};

// --- Login ---
export const loginTeacher = async (req, res) => {
  const { email, password } = req.body;
  try {
    const teacher = await TeacherModel.findOne({ email });
    if (!teacher) return res.json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, teacher.password);
    if (!match) return res.json({ success: false, message: 'Invalid credentials' });

    const token = createToken(teacher._id);
    res.json({ success: true, token, teacher: { _id: teacher._id, name: teacher.name, email: teacher.email, image: teacher.image } });
  } catch (err) {
    console.error('Teacher login error:', err);
    res.json({ success: false, message: 'Server error during login' });
  }
};

// --- Create class request (student) ---
export const createClassRequest = async (req, res) => {
  const { courseDetails, studentId, studentName, scheduleDetails } = req.body;

  try {
    const teachers = await TeacherModel.find({});
    if (!teachers.length) return res.status(500).json({ success: false, message: "No teachers available." });

    const randomTeacher = teachers[Math.floor(Math.random() * teachers.length)];

    const newRequest = new ClassRequest({
      courseId: courseDetails.courseId,
      courseTitle: courseDetails.courseTitle,
      studentId,
      studentName,
      teacherId: randomTeacher._id,
      scheduleTime: scheduleDetails?.preferredTime || '',
      preferredDate: scheduleDetails?.preferredDate || null,
      status: 'pending'
    });

    await newRequest.save();
    res.status(201).json({ success: true, message: 'Class request created successfully.', request: newRequest });
  } catch (error) {
    console.error('Error creating class request:', error);
    res.status(500).json({ success: false, message: 'Server error during request creation.' });
  }
};

// --- Get pending requests for teacher ---
export const getClassRequests = async (req, res) => {
  try {
    const teacherId = req.user?._id;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Teacher not authenticated' });

    const requests = await ClassRequest.find({ teacherId, status: 'pending' }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching class requests:', error);
    res.status(500).json({ message: error.message });
  }
};

// --- Get accepted classes for teacher ---
export const getManagedClasses = async (req, res) => {
  try {
    const teacherId = req.user?._id;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Teacher not authenticated' });

    const classes = await ClassRequest.find({ teacherId, status: 'accepted' }).sort({ preferredDate: 1 }).lean();
    res.json({ success: true, classes });
  } catch (error) {
    console.error('Error fetching managed classes:', error);
    res.status(500).json({ message: error.message });
  }
};

// --- Accept a class request (safe) ---
export const acceptClassRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const teacherId = req.user?._id;

    const request = await ClassRequest.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (request.teacherId.toString() !== teacherId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to accept this request.' });
    }

    // Update status without triggering full validation
    const updatedRequest = await ClassRequest.findByIdAndUpdate(
      requestId,
      { status: 'accepted' },
      { new: true, runValidators: false }
    );

    res.json({ success: true, message: 'Class request accepted', request: updatedRequest });
  } catch (error) {
    console.error('Error accepting class request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
