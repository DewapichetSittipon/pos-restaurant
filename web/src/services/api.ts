import axios from 'axios';

const apiOrigin = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';
const baseURL = `${apiOrigin}/api`;

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// แปลง path รูป (/uploads/...) เป็น URL เต็ม — รูปเสิร์ฟนอก /api
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${apiOrigin}${path}`;
}

// token ของลูกค้า (qr_token) แนบเป็น header x-qr-token ทุก request
let qrToken: string | null = null;

export function setQrToken(token: string | null): void {
  qrToken = token;
}

api.interceptors.request.use((config) => {
  if (qrToken) {
    config.headers.set('x-qr-token', qrToken);
  }
  return config;
});
