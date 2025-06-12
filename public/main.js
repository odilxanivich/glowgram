const galleryContainer = document.getElementById('galleryContainer');
const uploadForm = document.getElementById('uploadForm');
const photoInput = document.getElementById('photoInput');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const fullscreenImg = fullscreenOverlay.querySelector('img');

const socket = io('http://localhost:3000');

let images = [];

// Group images by date
function groupByDate(imgs) {
  const groups = {};
  imgs.forEach(img => {
    if (!groups[img.date]) groups[img.date] = [];
    groups[img.date].push(img);
  });
  return groups;
}

function renderGallery() {
  galleryContainer.innerHTML = '';
  const grouped = groupByDate(images);

  Object.keys(grouped).sort((a,b) => new Date(b) - new Date(a)).forEach(date => {
    const div = document.createElement('div');
    div.className = 'date-group';
    const title = document.createElement('div');
    title.className = 'date-title';
    title.textContent = date;
    div.appendChild(title);

    const gallery = document.createElement('div');
    gallery.className = 'gallery';

    grouped[date]
        .sort((a, b) => parseInt(b.id) - parseInt(a.id))  // newest images first
        .forEach(img => {
      const container = document.createElement('div');
      container.className = 'photo-container';

      const image = document.createElement('img');
      image.src = `/uploads/${img.filename}`;
      image.alt = 'Deleted Image';
      image.onclick = () => openFullscreen(image.src);

      const voteDiv = document.createElement('div');
      voteDiv.className = 'vote-buttons flex items-center gap-2 mt-2';  //# Updated: added flex styling for modern layout

      const likeBtn = document.createElement('button');
      likeBtn.className = 'vote-btn flex items-center gap-1';           //# Updated: modern look with icon + text
      likeBtn.innerHTML = `<i data-lucide="thumbs-up" width="16" height="16" bg-transparent class="text-green-600"></i> <span class="text-sm">${img.likes}</span>`;  //# Changed to Lucide icon
      likeBtn.onclick = (e) => {
        e.stopPropagation();
        sendVote(img.id, 'like');
      };

      const dislikeBtn = document.createElement('button');
      dislikeBtn.className = 'vote-btn flex items-center gap-1';         //# Updated: modern look with icon + text
      dislikeBtn.innerHTML = `<i data-lucide="thumbs-down" width="16" height="16" class="text-red-500"></i> <span class="text-sm">${img.dislikes}</span>`;  //# Changed to Lucide icon
      dislikeBtn.onclick = (e) => {
        e.stopPropagation();
        sendVote(img.id, 'dislike');
      };

      voteDiv.appendChild(likeBtn);
      voteDiv.appendChild(dislikeBtn);

      // # Download button
      const downloadBtn = document.createElement('a');
      downloadBtn.href = `/uploads/${img.filename}`;
      downloadBtn.download = img.filename;
      downloadBtn.className = 'vote-btn flex items-center gap-1';       //# Styled like others
      downloadBtn.innerHTML = `<i data-lucide="download" width="16" height="16" class="text-blue-500 hover:text-gray-800 transition-all duration-200"></i>`;
      downloadBtn.onclick = (e) => e.stopPropagation(); // prevent fullscreen opening
      voteDiv.appendChild(downloadBtn);

      container.appendChild(image);
      container.appendChild(voteDiv);

      gallery.appendChild(container);
    });

    div.appendChild(gallery);
    galleryContainer.prepend(div);
  });
  lucide.createIcons();  //# Added: initialize icons after rendering
}

function openFullscreen(src) {
  fullscreenImg.src = src;
  fullscreenOverlay.style.display = 'flex';
}

fullscreenOverlay.onclick = () => {
  fullscreenOverlay.style.display = 'none';
  fullscreenImg.src = '';
};

function fetchImages() {
  fetch('/images')
    .then(res => res.json())
    .then(data => {
      images = data;
      renderGallery();
    });
}

function sendVote(id, vote) {
  fetch('/vote', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ id, vote })
  }).then(res => res.json());
}

// Upload with admin check
uploadForm.onsubmit = (e) => {
  e.preventDefault();
  const file = photoInput.files[0];
  if (!file) return alert('Select a photo');

  const formData = new FormData();
  formData.append('photo', file);

  fetch('/upload', {
  method: 'POST',
  body: formData
})
.then(async (res) => {
  const contentType = res.headers.get('content-type');
  const isJSON = contentType && contentType.includes('application/json');

  if (!res.ok) {
    if (isJSON) {
      const error = await res.json();
      throw new Error(error.error || 'Upload failed');
    } else {
      const text = await res.text();
      throw new Error('Upload failed: ' + text);
    }
  }

  return isJSON ? res.json() : Promise.reject(new Error('Unexpected response format'));
})
.then(() => {
  photoInput.value = '';
})
.catch(err => {
  alert(err.message || 'Upload failed.');
});

// Admin login prompt
function askAdminCode() {
  const code = prompt("ONLY ADMINS CAN UPLOAD!\nWanna be with us?\nMessage me.\n\nIf you have the code, enter it:");
  if (!code) return;

  fetch('/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })
  .then(res => res.json())
  .then(res => {
    if (res.success) {
      alert("You're now an admin. Try uploading again.");
    } else {
      alert("Wrong code!");
    }
  })
  .catch(() => alert("Error authenticating."));
}

// Real-time listeners
socket.on('new-image', (img) => {
  images.unshift(img);
  renderGallery();
});

socket.on('vote-update', ({ id, likes, dislikes }) => {
  const img = images.find(i => i.id === id);
  if (img) {
    img.likes = likes;
    img.dislikes = dislikes;
    renderGallery();
  }
});

fetchImages();