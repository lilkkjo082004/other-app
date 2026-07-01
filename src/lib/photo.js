// Photo moments — read a picked image File, downscale it on-device (canvas) to a
// modest JPEG, and hand back both a data URL (for the chat bubble) and the raw
// base64 + media type (for the vision request). Downscaling keeps the upload
// small and the token cost low; nothing is uploaded anywhere except the AI call.
const MAX_EDGE = 768;     // longest side sent to the vision model
const QUALITY = 0.82;

export function readPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) { reject(new Error('not an image')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
        URL.revokeObjectURL(url);
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ dataUrl, base64, mediaType: 'image/jpeg', width: w, height: h });
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('could not load image')); };
    img.src = url;
  });
}

// Read a picked image into a small SQUARE avatar (center-cropped) — for the
// user's profile photo. Kept small (default 256px JPEG) so it can live on the
// persisted/synced profile without bloating it.
export function readAvatar(file, edge = 256) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) { reject(new Error('not an image')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = edge; canvas.height = edge;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, edge, edge);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('could not load image')); };
    img.src = url;
  });
}

// A tiny thumbnail (data URL) to keep in the persisted session so the photo
// bubble survives a reload without bloating localStorage.
export function thumbnail(dataUrl, edge = 120) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, edge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      } catch (e) { resolve(''); }
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
}
