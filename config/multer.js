import multer from 'multer';

// Storage configuration for uploaded files
const storage = multer.diskStorage({
    destination: "uploads", // Folder where images will be stored (needs to be created manually or by multer)
    filename: (req, file, cb) => {
        // Renames the file to prevent collision: Date.now() + original filename
        return cb(null, `${Date.now()}_${file.originalname}`);
    }
});

// Create the upload middleware instance
const upload = multer({ storage: storage });

export default upload;
