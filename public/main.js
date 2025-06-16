const galleryContainer = document.getElementById('galleryContainer');
const uploadForm = document.getElementById('uploadForm');
const photoInput = document.getElementById('photoInput');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const fullscreenImg = fullscreenOverlay.querySelector('img');

let startX = 0;
let currentIndex = 0;

const socket = io(); // local server

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
    title.className = 'date-title font-semibold mb-2';
    title.textContent = date;
    div.appendChild(title);

    const gallery = document.createElement('div');
    gallery.className = 'gallery grid grid-cols-2 md:grid-cols-3 gap-4';

    grouped[date].sort((a, b) => parseInt(b.id) - parseInt(a.id)).forEach(img => {
      const container = document.createElement('div');
      container.className = 'photo-container';

      const image = document.createElement('img');
      image.src = img.filename; // already prefixed with /uploads/
      image.alt = 'Image';
      image.className = 'rounded cursor-pointer hover:scale-105 transition';
      image.onclick = () => openFullscreen(image.src);

      const voteDiv = document.createElement('div');
      voteDiv.className = 'vote-buttons flex items-center gap-2 mt-2';

      const likeBtn = document.createElement('button');
      likeBtn.className = 'vote-btn flex items-center gap-1';
      likeBtn.innerHTML = `<i data-lucide="thumbs-up" width="16" height="16" class="text-green-600"></i> <span class="text-sm">${img.likes}</span>`;
      likeBtn.onclick = (e) => {
        e.stopPropagation();
        sendVote(img.id, 'like');
      };

      const dislikeBtn = document.createElement('button');
      dislikeBtn.className = 'vote-btn flex items-center gap-1';
      dislikeBtn.innerHTML = `<i data-lucide="thumbs-down" width="16" height="16" class="text-red-500"></i> <span class="text-sm">${img.dislikes}</span>`;
      dislikeBtn.onclick = (e) => {
        e.stopPropagation();
        sendVote(img.id, 'dislike');
      };

      const downloadBtn = document.createElement('a');
      downloadBtn.href = img.filename;
      downloadBtn.download = img.filename.split('/').pop();
      downloadBtn.className = 'vote-btn flex items-center gap-1';
      downloadBtn.innerHTML = `<i data-lucide="download" width="16" height="16" class="text-blue-500 hover:text-gray-800 transition-all duration-200"></i>`;
      downloadBtn.onclick = (e) => e.stopPropagation();

      voteDiv.appendChild(likeBtn);
      voteDiv.appendChild(dislikeBtn);
      voteDiv.appendChild(downloadBtn);

      container.appendChild(image);
      container.appendChild(voteDiv);
      gallery.appendChild(container);
    });

    div.appendChild(gallery);
    galleryContainer.appendChild(div);
  });

  lucide.createIcons();
}

function openFullscreen(src) {
  fullscreenImg.src = src;
  fullscreenOverlay.style.display = 'flex';
  fullscreenOverlay.classList.remove('hidden');
  currentIndex = images.findIndex(img => img.filename === src);
}
fullscreenOverlay.onclick = () => {
  fullscreenOverlay.classList.add('hidden');
  fullscreenOverlay.style.display = 'none';
  fullscreenImg.src = '';
};

//swipe function
fullscreenOverlay.addEventListener('touchstart', (e) => {
  startX = e.touches[0].clientX;
}, false);

fullscreenOverlay.addEventListener('touchend', (e) => {
  const endX = e.changedTouches[0].clientX;
  const diff = startX - endX;

  if (Math.abs(diff) > 50) {
    if (diff > 0) {
      showNextImage(); // swipe left
    } else {
      showPrevImage(); // swipe right
    }
  }
});
//naviagtion function
function showNextImage() {
  if (currentIndex < images.length - 1) {
    currentIndex++;
    fullscreenImg.src = images[currentIndex].filename;
  }
}

function showPrevImage() {
  if (currentIndex > 0) {
    currentIndex--;
    fullscreenImg.src = images[currentIndex].filename;
  }
}



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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, vote })
  });
}

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
  .then(res => {
    if (!res.ok) return res.text().then(msg => { throw new Error(msg); });
    return res.json();
  })
  .then(() => {
    photoInput.value = '';
  })
  .catch(err => {
    if (err.message.includes('ONLY ADMINS')) {
      askAdminCode();
    } else {
      alert(err.message || 'Upload failed.');
    }
  });
};

function askAdminCode() {
  const code = prompt("ONLY ADMINS CAN UPLOAD!\nWanna be with us?\nMessage me.\n\nIf you have the code, enter it:");
  if (!code) return;

  fetch('/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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

// Real-time updates
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