// Required Modules
require('dotenv').config(); // Load environment variables

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Cloudinary Config
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'glowgram',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
  },
});
const upload = multer({ storage });

// Express + HTTP + Socket.IO setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Change to your frontend origin if hosted separately
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static('public')); // For serving static frontend files
app.use(session({
  secret: 'superSecretSessionKey123', // should be long + random
  resave: false,
  saveUninitialized: true,
}));

// Admin secret
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'letmein123';

// In-memory image list
let images = []; // { id, filename, date, likes, dislikes }

// Routes

// Admin Auth
app.post('/auth', (req, res) => {
  const { code } = req.body;
  if (code === ADMIN_SECRET) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: 'Wrong code' });
});

//create a folder
const uploadsPath = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
// Upload from file
app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ success: false, message: 'ONLY ADMINS CAN UPLOAD! WANNA BE WITH US? MESSAGE ME.' });
  }

  if (!req.file) return res.status(400).send('No file uploaded');

  const img = {
    id: Date.now().toString(),
    filename: req.file.path, // Cloudinary public URL
    date: new Date().toISOString().split('T')[0],
    likes: 0,
    dislikes: 0,
  };

  images.push(img);
  io.emit('new-image', img);
  res.json(img);
});

// Import from URL (fixed version with buffer)
app.post('/import-image', async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ success: false, message: 'ONLY ADMINS CAN IMPORT! WANNA BE WITH US? MESSAGE ME.' });
  }

  const { url } = req.body;
  if (!url || !url.startsWith('http')) return res.status(400).send('Invalid URL');

  try {
    // Fetch image from Pinterest as buffer
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://www.pinterest.com/'
      }
    });

    const imageBuffer = Buffer.from(response.data, 'binary');

    // Upload to Cloudinary via stream
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'glowgram' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary error:', error);
          return res.status(500).json({ error: 'Cloudinary upload failed', details: error.message });
        }

        const img = {
          id: Date.now().toString(),
          filename: result.secure_url,
          date: new Date().toISOString().split('T')[0],
          likes: 0,
          dislikes: 0,
        };

        images.push(img);
        io.emit('new-image', img);
        res.json(img);
      }
    );

    uploadStream.end(imageBuffer);

  } catch (err) {
    console.error('Fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch or upload image', details: err.message });
  }
});

// Voting
app.post('/vote', (req, res) => {
  const { id, vote } = req.body;
  const img = images.find(i => i.id === id);
  if (!img) return res.status(404).send('Image not found');

  if (vote === 'like') img.likes++;
  else if (vote === 'dislike') img.dislikes++;
  else return res.status(400).send('Invalid vote');

  io.emit('vote-update', { id: img.id, likes: img.likes, dislikes: img.dislikes });
  res.json(img);
});

// Get all images
app.get('/images', (req, res) => {
  res.json(images);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('User connected');
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
