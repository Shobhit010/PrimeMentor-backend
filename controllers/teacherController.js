import TeacherModel from '../models/TeacherModel.js';
import UserModel from '../models/UserModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import ClassRequest from '../models/ClassRequest.js';

const createToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// --- Register ---
export const registerTeacher = async (req, res) => {
  // Destructure all expected fields from the request body
  const { 
    name, email, password, address, mobileNumber, subject, 
    accountHolderName, bankName, ifscCode, accountNumber, 
    aadharCard, panCard 
  } = req.body;
  
  // 1. FIX: Access file paths correctly from req.files using the field names from upload.fields()
  const imagePath = req.files?.image?.[0]?.filename || ''; 
  const cvPath = req.files?.cvFile?.[0]?.filename || '';
  
  try {
    // 2. Basic Validation (Email and Password checked first)
    const exists = await TeacherModel.findOne({ email });
    if (exists) return res.json({ success: false, message: 'Teacher already exists' });
    if (!validator.isEmail(email)) return res.json({ success: false, message: 'Invalid email' });
    if (password.length < 8) return res.json({ success: false, message: 'Password too short' });

    // 3. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // 4. Create Teacher Document with ALL fields
    // NOTE: The model will set empty strings to null for fields that are not strictly required.
    const teacher = await TeacherModel.create({ 
        name, 
        email, 
        password: hashed, 
        image: imagePath, // Profile Picture Filename
        address, 
        mobileNumber, 
        subject, // Saved as comma-separated string from frontend
        accountHolderName, 
        bankName, 
        ifscCode, 
        accountNumber,
        aadharCard, 
        panCard,
        cvFile: cvPath, // CV Document Filename
        status: 'pending' // New teachers start as pending review
    });

    // 5. Respond with Token and Redirect Trigger (data.success: true)
    const token = createToken(teacher._id);
    res.json({ success: true, token, teacher: { _id: teacher._id, name: teacher.name, email: teacher.email, image: teacher.image } });
  } catch (err) {
    console.error('Teacher registration error:', err);
    
    // 🛑 FIX: Handle Mongoose Validation Error 
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        const firstError = errors.length > 0 ? errors[0] : 'Missing required data or invalid format.';
        return res.json({ success: false, message: `Validation Failed: ${firstError}` });
    }
    
    res.json({ success: false, message: 'Server error during registration. Check server console for details.' });
  }
};

// --- Login (No change needed) ---
export const loginTeacher = async (req, res) => {
  const { email, password } = req.body;
  try {
    const teacher = await TeacherModel.findOne({ email });
    if (!teacher) return res.json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, teacher.password);
    if (!match) return res.json({ success: false, message: 'Invalid credentials' });

    const token = createToken(teacher._id);
    res.json({ success: true, token, teacher: { 
        _id: teacher._id, 
        name: teacher.name, 
        email: teacher.email, 
        image: teacher.image,
    } });
  } catch (err) {
    console.error('Teacher login error:', err);
    res.json({ success: false, message: 'Server error during login' });
  }
};

// --- Class Requests/Managed Classes (No change needed) ---
export const getClassRequests = async (req, res) => {
    try {
        const teacherId = req.user?._id;
        if (!teacherId) return res.status(401).json({ success: false, message: 'Teacher not authenticated' });

        const requests = await ClassRequest.find({ 
            teacherId, 
            status: 'accepted' 
        }).sort({ enrollmentDate: -1 }).lean();

        res.json({ success: true, requests });
    } catch (error) {
        console.error('Error fetching assigned class requests:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getManagedClasses = async (req, res) => {
    try {
        const teacherId = req.user?._id;
        if (!teacherId) return res.status(401).json({ success: false, message: 'Teacher not authenticated' });

        const classes = await ClassRequest.find({ 
            teacherId, 
            status: 'accepted' 
        }).sort({ preferredDate: 1 }).lean();

        res.json({ success: true, classes });
    } catch (error) {
        console.error('Error fetching managed classes:', error);
        res.status(500).json({ message: error.message });
    }
};

export const acceptClassRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const teacherId = req.user?._id;
    
        const request = await ClassRequest.findById(requestId);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    
        if (request.teacherId.toString() !== teacherId.toString()) {
          return res.status(403).json({ success: false, message: 'Not authorized to accept this request.' });
        }
    
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