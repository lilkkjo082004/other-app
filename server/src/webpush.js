// Web Push sender — VAPID (RFC 8292) + aes128gcm payload encryption (RFC 8291),
// implemented with Web Crypto so it runs on Cloudflare Workers and Node.
const enc = new TextEncoder();

function b64urlFromBytes(bytes) {
  let s = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function bytesFromB64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
function concat(...arrs) {
  const len = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}
async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8);
  return new Uint8Array(bits);
}

// RFC 8291 §3.4 — encrypt `payload` for a push subscription.
export async function encryptPayload(payload, clientPubB64, authB64) {
  const clientPub = bytesFromB64url(clientPubB64);   // 65-byte uncompressed P-256 point
  const auth = bytesFromB64url(authB64);             // 16 bytes
  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const serverPub = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));
  const clientKey = await crypto.subtle.importKey('raw', clientPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, serverKeys.privateKey, 256));

  const ikm = await hkdf(auth, shared, concat(enc.encode('WebPush: info\0'), clientPub, serverPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  const cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const plaintext = concat(typeof payload === 'string' ? enc.encode(payload) : payload, new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, cekKey, plaintext));

  // aes128gcm content-coding header: salt(16) | rs(4) | idlen(1) | keyid(serverPub) | ciphertext
  const header = new Uint8Array(16 + 4 + 1 + serverPub.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = serverPub.length;
  header.set(serverPub, 21);
  return concat(header, ciphertext);
}

export async function importVapid(privatePkcs8B64, publicB64url, subject) {
  const privateKey = await crypto.subtle.importKey('pkcs8', bytesFromB64url(privatePkcs8B64), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return { privateKey, publicB64url, subject: subject || 'mailto:admin@other.app' };
}

// RFC 8292 — VAPID Authorization header for a given push endpoint.
export async function vapidHeaders(endpoint, vapid) {
  const aud = new URL(endpoint).origin;
  const header = b64urlFromBytes(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payload = b64urlFromBytes(enc.encode(JSON.stringify({ aud, exp, sub: vapid.subject })));
  const signingInput = `${header}.${payload}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, vapid.privateKey, enc.encode(signingInput)));
  const jwt = `${signingInput}.${b64urlFromBytes(sig)}`;
  return { Authorization: `vapid t=${jwt}, k=${vapid.publicB64url}`, 'Content-Encoding': 'aes128gcm', TTL: '86400' };
}

// Send one push. Returns the HTTP status (201 = accepted; 404/410 = gone).
export async function sendPush(subscription, payload, vapid) {
  const body = await encryptPayload(payload, subscription.keys.p256dh, subscription.keys.auth);
  const headers = await vapidHeaders(subscription.endpoint, vapid);
  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/octet-stream' },
    body,
  });
  return res.status;
}
