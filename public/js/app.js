/* app.js — onlybuildings frontend */

const uploadBtn    = document.getElementById('uploadBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose   = document.getElementById('modalClose');
const dropZone     = document.getElementById('dropZone');
const fileInput    = document.getElementById('fileInput');
const dropInner    = document.getElementById('dropInner');
const previewImg   = document.getElementById('previewImg');
const modalStatus  = document.getElementById('modalStatus');
const submitBtn    = document.getElementById('submitBtn');
const grid         = document.getElementById('grid');
const lightbox     = document.getElementById('lightbox');
const lightboxImg  = document.getElementById('lightboxImg');
const lightboxClose= document.getElementById('lightboxClose');

let selectedFile = null;
let verifiedOk   = false;

// ─── MODAL OPEN / CLOSE ───────────────────────────────────────────────────────
uploadBtn.addEventListener('click', () => modalOverlay.classList.add('open'));

function closeModal() {
  modalOverlay.classList.remove('open');
  resetModal();
}
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

function resetModal() {
  selectedFile = null;
  verifiedOk   = false;
  previewImg.src = '';
  previewImg.classList.remove('visible');
  dropInner.style.display = '';
  dropZone.classList.remove('has-preview', 'dragover');
  setStatus('', '');
  submitBtn.disabled = true;
}

// ─── DROP / SELECT FILE ───────────────────────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    setStatus('images only, please.', 'error');
    return;
  }
  selectedFile = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewImg.classList.add('visible');
  dropInner.style.display = 'none';
  dropZone.classList.add('has-preview');
  verifyBuilding(file);
}

// ─── AI VERIFICATION ──────────────────────────────────────────────────────────
async function verifyBuilding(file) {
  setStatus('checking if this is a building…', 'checking');
  submitBtn.disabled = true;
  verifiedOk = false;

  try {
    const base64 = await toBase64(file);
    const res = await fetch('/.netlify/functions/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mimeType: file.type }),
    });
    const data = await res.json();

    if (data.isBuilding) {
      setStatus('✓ confirmed. it is a building.', 'ok');
      verifiedOk = true;
      submitBtn.disabled = false;
    } else {
      setStatus(data.reason || 'doesn\'t look like a building. try another photo.', 'error');
    }
  } catch (err) {
    setStatus('verification failed. try again.', 'error');
    console.error(err);
  }
}

// ─── SUBMIT ───────────────────────────────────────────────────────────────────
submitBtn.addEventListener('click', async () => {
  if (!selectedFile || !verifiedOk) return;
  setStatus('uploading…', 'checking');
  submitBtn.disabled = true;

  try {
    const base64 = await toBase64(selectedFile);
    const res = await fetch('/.netlify/functions/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mimeType: selectedFile.type }),
    });
    const data = await res.json();

    if (data.url) {
      setStatus('submitted. the building is among us.', 'ok');
      prependPhoto(data.url);
      setTimeout(closeModal, 1400);
    } else {
      setStatus('upload failed. try again.', 'error');
      submitBtn.disabled = false;
    }
  } catch (err) {
    setStatus('upload failed. try again.', 'error');
    submitBtn.disabled = false;
    console.error(err);
  }
});

// ─── GRID ─────────────────────────────────────────────────────────────────────
async function loadGrid() {
  showSkeletons();
  try {
    const res = await fetch('/.netlify/functions/photos');
    const data = await res.json();
    grid.innerHTML = '';

    if (!data.photos || data.photos.length === 0) {
      showEmpty();
      return;
    }

    data.photos.forEach((url, i) => addPhotoToGrid(url, i));
  } catch (err) {
    grid.innerHTML = '';
    console.error('Failed to load photos', err);
  }
}

function showSkeletons() {
  grid.innerHTML = '';
  const heights = [220, 310, 180, 260, 340, 200, 280];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement('div');
    el.className = 'skeleton';
    el.style.height = heights[i % heights.length] + 'px';
    grid.appendChild(el);
  }
}

function showEmpty() {
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.innerHTML = `
    <div class="big">NO BUILDINGS</div>
    <div class="small">be the first to submit one →</div>
  `;
  document.body.appendChild(el);
}

function addPhotoToGrid(url, delay = 0) {
  const item = document.createElement('div');
  item.className = 'grid-item';
  item.style.animationDelay = (delay * 0.04) + 's';
  const img = document.createElement('img');
  img.src = url;
  img.alt = 'a building';
  img.loading = 'lazy';
  img.addEventListener('click', () => openLightbox(url));
  item.appendChild(img);
  grid.appendChild(item);
}

function prependPhoto(url) {
  const existing = document.querySelector('.empty-state');
  if (existing) existing.remove();
  const item = document.createElement('div');
  item.className = 'grid-item';
  const img = document.createElement('img');
  img.src = url;
  img.alt = 'a building';
  img.addEventListener('click', () => openLightbox(url));
  item.appendChild(img);
  grid.insertBefore(item, grid.firstChild);
}

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────────
function openLightbox(url) {
  lightboxImg.src = url;
  lightbox.classList.add('open');
}
lightboxClose.addEventListener('click', () => lightbox.classList.remove('open'));
lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.remove('open'); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    lightbox.classList.remove('open');
    closeModal();
  }
});

// ─── UTILS ───────────────────────────────────────────────────────────────────
function setStatus(msg, type) {
  modalStatus.textContent = msg;
  modalStatus.className = 'modal-status' + (type ? ' ' + type : '');
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
loadGrid();
