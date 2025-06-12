// Import required modules
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

// Initialize Express and Socket.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server);

//vaqtinchalik
const uploadRoutes = require('./routes/upload');

app.use('/api', uploadRoutes);


// Enable cross-origin requests and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files (frontend HTML, JS, CSS)
app.use(express.static('public'));  //link frontend 

// Serve uploaded image files
app.use('/uploads', express.static('public/uploads'));

// Enable session management (for admin access)
app.use(session({
  secret: 'superSecret123', //kuchli parol ornat!
  resave: false,
  saveUninitialized: true
}));

// Secret code for admin upload access
const ADMIN_SECRET = 'letmein123'; // your real upload code here

// Store all uploaded images (in memory only)
let images = []; // structure: { id, filename, date, likes, dislikes }

// File upload configuration — save images to public/uploads/
const { storage } = require('./cloudinary');
const upload = multer({ storage });

// ADMIN AUTH — Client sends secret code to unlock upload access
app.post('/auth', (req, res) => {
  const { code } = req.body;
  if (code === ADMIN_SECRET) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: 'Wrong code' });
});

// UPLOAD — Only admins can upload images
app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({
        success: false,
        message: 'ONLY ADMINS CAN UPLOAD! WANNA BE WITH US? MESSAGE ME.'
    });
  }

  // Handle missing file error
  if (!req.file) return res.status(400).send('No file uploaded');


  //pinterest fetching
  app.post('/import-image', async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ success: false, message: 'ONLY ADMINS CAN IMPORT! MESSAGE ME.' });
  }

  const { url } = req.body;
  if (!url || !url.startsWith('http')) return res.status(400).send('Invalid URL');

  try {
    const response = await axios.get(url, { responseType: 'stream' });

    // Ensure extension is safe
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




  // Create image metadata
   const img = {
    id: Date.now().toString(),
    filename: req.file.filename,
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    likes: 0,
    dislikes: 0,
  };

   // Save in memory and broadcast to clients
  images.push(img);
  io.emit('new-image', img);
  res.json(img);
});

// GET ALL IMAGES — Publicly accessible
app.get('/images', (req, res) => {
  res.json(images);
});

// VOTE — Like or dislike an image
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

// SOCKET CONNECTION — Real-time updates
io.on('connection', (socket) => {
  console.log('User connected');
});

// START SERVER
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});