# Glowgram

**Glowgram** is a real-time image-sharing gallery powered by [Cloudinary](https://cloudinary.com/) and [Socket.IO](https://socket.io/). It allows users to upload or import images, view them instantly in a dynamic gallery, and experience a modern, responsive interface built with [Tailwind CSS](https://tailwindcss.com/) and [daisyUI](https://daisyui.com/).

![Glowgram Screenshot](screenshot.png) <!-- Add a real screenshot if available -->

## Features

- 🚀 **Real-time image sharing** — See new images appear instantly.
- ☁️ **Cloudinary storage** — Secure, fast, and reliable image hosting.
- 🖼️ **Easy upload/import** — Upload images from your device or import via URL.
- 🎨 **Modern UI** — Built with Tailwind CSS & daisyUI for a seamless experience.
- 🔒 **Admin controls** — Optional admin verification for image imports.
- ⚡ **Live updates** — Powered by Socket.IO for instant gallery refresh.
- 📱 **Responsive design** — Works beautifully on mobile and desktop.

## Demo

[Live Demo]

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14+ recommended)
- [Cloudinary account](https://cloudinary.com/) (for image hosting)

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/odilxanivich/glowgram.git
   cd glowgram
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment variables:**

   Create a `.env` file in the root directory and add your Cloudinary and other configuration like so:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   PORT=3000
   ```

4. **Run the app:**
   ```sh
   npm start
   ```

5. **Visit [http://localhost:3000](http://localhost:3000) in your browser.**

## Usage

- **Upload an image:** Click the upload form and select an image file.
- **Import by URL:** Paste an image link and click "Import".
- **Real-time updates:** All users see new images appear instantly.
- **Fullscreen mode:** Click on an image to view it in fullscreen.

## Technologies Used

- [Cloudinary](https://cloudinary.com/) — Image hosting & transformations
- [Socket.IO](https://socket.io/) — Real-time communication
- [Tailwind CSS](https://tailwindcss.com/) & [daisyUI](https://daisyui.com/) — UI framework
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) — Backend server

## Author

- [Mizano](https://mizano.netlify.app/) / [@odilxanivich](https://github.com/odilxanivich)

## License

MIT License

---

> © 2024 Mizano, Inc. All rights reserved.
