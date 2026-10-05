const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists (uploads/ is git-ignored, so a fresh deploy won't have it)
const uploadDir = 'uploads/payments';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir + '/');
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const err = new Error('Only PNG, JPG, JPEG or PDF files are allowed');
        err.status = 400;
        cb(err, false);
    }
};

const upload = multer({ storage, fileFilter });
module.exports = upload;
