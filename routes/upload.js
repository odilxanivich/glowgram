// routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });

// #1 [LINE 9+] Add error handling
router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });  // #2 Validate file
  }
  res.json({ imageUrl: req.file.path });
});

// #3 (optional) catch-all error handler
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Server error' });
});

module.exports = router;
