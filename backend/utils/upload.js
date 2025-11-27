const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = file.mimetype.startsWith('image') ? 'images' : 
                 file.mimetype.startsWith('video') ? 'videos' : 
                 file.mimetype.startsWith('audio') ? 'audio' : 'files';
    cb(null, `uploads/${type}/`);
  },
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mp3|wav|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, audio, and PDFs allowed.'));
  }
};

// Upload configurations
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10
  }
});

const uploadSingle = upload.single('file');
const uploadMultiple = upload.array('files', 10);
const uploadFields = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 5 },
  { name: 'audio', maxCount: 3 }
]);

module.exports = { upload, uploadSingle, uploadMultiple, uploadFields };
