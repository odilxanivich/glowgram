// Required Modules
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Cloudinary Setup (Embedded Here)
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'uploads', // your Cloudinary folder name
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
  },
});

const upload = multer({ storage });

// App & Socket.IO Setup
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));
app.use(session({
  secret: 'superSecret123',
  resave: false,
  saveUninitialized: true
}));

// Admin upload secret
const ADMIN_SECRET = 'letmein123';

// Image Storage
let images = []; // structure: { id, filename, date, likes, dislikes }

// ADMIN AUTH
app.post('/auth', (req, res) => {
  const { code } = req.body;
  if (code === ADMIN_SECRET) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: 'Wrong code' });
});

// UPLOAD — via form
app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'ONLY ADMINS CAN UPLOAD! WANNA BE WITH US? MESSAGE ME.'
    });
  }

  if (!req.file) return res.status(400).send('No file uploaded');

  const img = {
    id: Date.now().toString(),
    filename: req.file.path, // Cloudinary returns URL in .path
    date: new Date().toISOString().split('T')[0],
    likes: 0,
    dislikes: 0,
  };

  images.push(img);
  io.emit('new-image', img);
  res.json(img);
});

// IMPORT IMAGE — from Pinterest or external URL
app.post('/import-image', async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ success: false, message: 'ONLY ADMINS CAN IMPORT! MESSAGE ME.' });
  }

  const { url } = req.body;
  if (!url || !url.startsWith('http')) return res.status(400).send('Invalid URL');

  try {
    const response = await axios({
      url,
      responseType: 'stream',
    });

    const ext = path.extname(url).split('?')[0] || '.jpg';
    const filename = uuidv4() + ext;
    const filepath = path.join(__dirname, 'public/uploads', filename);

    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    writer.on('finish', () => {
      const img = {
        id: Date.now().toString(),
        filename,
        date: new Date().toISOString().split('T')[0],
        likes: 0,
        dislikes: 0,
      };
      images.push(img);
      io.emit('new-image', img);
      res.json(img);
    });

    writer.on('error', () => {
      res.status(500).send('Failed to save image');
    });

  } catch (err) {
    res.status(500).send('Failed to fetch image');
  }
});

// GET ALL IMAGES
app.get('/images', (req, res) => {
  res.json(images);
});

// VOTING — Like / Dislike
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

// SOCKET.IO
io.on('connection', (socket) => {
  console.log('User connected');
});

// START SERVER
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});