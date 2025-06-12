const urlForm = document.getElementById('urlForm');
const imageUrlInput = document.getElementById('imageUrl');

urlForm.onsubmit = (e) => {
  e.preventDefault();
  const url = imageUrlInput.value;
  if (!url) return;

  fetch('/import-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })
  .then(res => {
    if (!res.ok) return res.json().then(err => { throw err; });
    return res.json();
  })
  .then(() => {
    imageUrlInput.value = '';
  })
  .catch(err => {
    if (err.message && err.message.includes('ONLY ADMINS')) {
      askAdminCode(); // already exists in your main.js
    } else {
      alert(err.message || 'Image import failed');
    }
  });
};
