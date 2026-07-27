// Smart upload: PC → website
// Images: compressed in browser, then stored in our own database (no setup needed)
// Video / big files: uploaded to Cloudinary if connected (Apps → Media Library)
const MAX_DIM = 1600;
const JPEG_Q = 0.82;
const DB_MAX_MB = 7;

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

async function compressImage(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', JPEG_Q));
    if (blob && blob.size > 0 && blob.size < file.size) return { blob, mime: 'image/jpeg' };
  } catch { /* fall through — upload original */ }
  return { blob: file, mime: file.type || 'image/jpeg' };
}

async function uploadToDb(file, token) {
  const { blob, mime } = file.type?.startsWith('image/') ? await compressImage(file) : { blob: file, mime: file.type };
  if (blob.size > DB_MAX_MB * 1024 * 1024) throw new Error(`File is too large (max ${DB_MAX_MB}MB) — please choose a smaller image`);
  const dataBase64 = await blobToBase64(blob);
  const r = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mime, dataBase64 }),
  });
  const d = await r.json();
  if (!r.ok || !d.url) throw new Error(d.message || 'Upload failed — please try again');
  return d.url;
}

async function uploadToCloudinary(file, media) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', media.uploadPreset);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${media.cloudName}/auto/upload`, { method: 'POST', body: fd });
  const d = await r.json();
  if (!d.secure_url) throw new Error(d.error?.message || 'Cloudinary upload failed');
  return d.secure_url;
}

// Videos / big files — uploaded in 3MB slices so free hosting limits never hit
async function uploadChunked(file, token, mime, onProgress) {
  const start = await fetch('/api/uploads/chunk/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mime }),
  }).then((r) => r.json());
  if (!start.session) throw new Error(start.message || 'Could not start upload');
  if (file.size > start.maxTotal) throw new Error('File is over 45MB — please try a shorter clip (10–30s) or use a YouTube link');

  const CHUNK = start.maxChunk;
  const total = Math.ceil(file.size / CHUNK);
  for (let i = 0; i < total; i += 1) {
    const slice = file.slice(i * CHUNK, (i + 1) * CHUNK);
    const dataBase64 = await blobToBase64(slice);
    const r = await fetch(`/api/uploads/chunk/${start.session}/${i}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dataBase64 }),
    }).then((x) => x.json());
    if (!r.ok) throw new Error(r.message || `Part ${i + 1} failed to upload`);
    onProgress?.(Math.round(((i + 1) / total) * 100));
  }
  const fin = await fetch(`/api/uploads/chunk/${start.session}/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mime }),
  }).then((x) => x.json());
  if (!fin.url) throw new Error(fin.message || 'Upload did not complete');
  return fin.url;
}

// Returns a usable URL for the file. Throws with a user-friendly message on failure.
export async function smartUpload(file, { media = {}, token, onProgress } = {}) {
  const isImage = (file.type || '').startsWith('image/');
  const hasCloudinary = !!(media.cloudName && media.uploadPreset);
  if (hasCloudinary) return uploadToCloudinary(file, media);          // best path when connected
  if (isImage) return uploadToDb(file, token);                        // zero-setup images
  return uploadChunked(file, token, file.type || 'video/mp4', onProgress); // zero-setup video
}
