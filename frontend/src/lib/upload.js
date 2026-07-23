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
  if (blob.size > DB_MAX_MB * 1024 * 1024) throw new Error(`File bohat bari hai (max ${DB_MAX_MB}MB) — choti image try karein`);
  const dataBase64 = await blobToBase64(blob);
  const r = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mime, dataBase64 }),
  });
  const d = await r.json();
  if (!r.ok || !d.url) throw new Error(d.message || 'Upload nahi hui — dobara koshish karein');
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

// Returns a usable URL for the file. Throws with a user-friendly message on failure.
export async function smartUpload(file, { media = {}, token } = {}) {
  const isImage = (file.type || '').startsWith('image/');
  const hasCloudinary = !!(media.cloudName && media.uploadPreset);
  if (hasCloudinary) return uploadToCloudinary(file, media);          // best path when connected
  if (isImage) return uploadToDb(file, token);                        // zero-setup path
  throw new Error('Video upload ke liye Apps → Media Library mein Cloudinary connect karein, ya YouTube/MP4 link paste karein');
}
