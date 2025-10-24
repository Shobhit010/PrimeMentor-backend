// backend/middlewares/authTeacherMiddleware.js
import jwt from 'jsonwebtoken';
import TeacherModel from '../models/TeacherModel.js';

export const protectTeacher = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token found' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teacher = await TeacherModel.findById(decoded.id).select('-password');

    if (!teacher) return res.status(401).json({ message: 'Teacher not found' });

    req.user = teacher;
    next();
  } catch (err) {
    console.error('❌ JWT verification error:', err.message);
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};
