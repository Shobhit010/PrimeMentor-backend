// backend/config/multer.js
import multer from 'multer';

// Storage configuration for uploaded files
const storage = multer.diskStorage({
    destination: "uploads", // Folder where images and files will be stored
    filename: (req, file, cb) => {
        // Renames the file to prevent collision: Date.now() + original filename
        // Example: 1730000000000_profile.jpg
        return cb(null, `${Date.now()}_${file.originalname}`);
    }
});

// Create the upload middleware instance
const upload = multer({ storage: storage });

export default upload;