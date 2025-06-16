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

// Import from URL
app.post('/import-image', async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ success: false, message: 'ONLY ADMINS CAN IMPORT! WANNA BE WITH US? MESSAGE ME.' });
  }

  const { url } = req.body;
  if (!url || !url.startsWith('http')) return res.status(400).send('Invalid URL');

  try {
    // Download image to a temporary file
    const ext = path.extname(url).split('?')[0] || '.jpg';
    const filename = uuidv4() + ext;
    const filepath = path.join(__dirname, 'tmp', filename);

    const response = await axios({ url, responseType: 'stream' });
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    writer.on('finish', async () => {
      try {
        const uploadResult = await cloudinary.uploader.upload(filepath, {
          folder: 'glowgram',
        });

        const img = {
          id: Date.now().toString(),
          filename: uploadResult.secure_url,
          date: new Date().toISOString().split('T')[0],
          likes: 0,
          dislikes: 0,
        };

        images.push(img);
        io.emit('new-image', img);
        fs.unlinkSync(filepath); // delete temp file
        res.json(img);
      } catch (err) {
        res.status(500).send('Failed to upload to Cloudinary');
      }
    });

    writer.on('error', () => {
      res.status(500).send('Failed to save image');
    });

  } catch (err) {
    res.status(500).send('Failed to fetch image');
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
