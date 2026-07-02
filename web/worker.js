// Cloudflare Worker (static assets + reverse proxy)
//
// ทำไมต้องมีตัวนี้: frontend (Cloudflare) กับ backend (Render) อยู่คนละโดเมน
// ถ้ายิง API ตรงไป *.onrender.com cookie ที่ backend set จะเป็น "third-party cookie"
// ซึ่ง incognito / Safari / Chrome (โหมดบล็อก 3rd-party) จะไม่ยอมเก็บ → login แล้วเด้งออก
//
// วิธีแก้: proxy /api และ /socket.io ผ่านโดเมน frontend เอง → browser เห็นเป็น
// same-origin → cookie เป็น first-party (ไม่โดนบล็อก) และไม่ต้องพึ่ง CORS อีกต่อไป
// ที่เหลือ (static assets / SPA routes) ปล่อยให้ env.ASSETS จัดการตามเดิม
const BACKEND = 'https://pos-restaurant-backend-ixyu.onrender.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
      const target = BACKEND + url.pathname + url.search;
      // ส่งต่อ request เดิมทั้งก้อน — method/headers/body + WebSocket upgrade (socket.io)
      // response ที่ได้ (รวม Set-Cookie) ถูกส่งกลับ browser ในนามโดเมน frontend
      return fetch(target, request);
    }
    return env.ASSETS.fetch(request);
  },
};
