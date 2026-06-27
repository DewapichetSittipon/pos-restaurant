import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA: ติดตั้งลงเครื่องได้ + cache app shell ให้เปิดได้แม้เน็ตหลุดชั่วคราว
    // ข้อมูล API ไม่ถูก cache (NetworkOnly) — กันยอด/สถานะโต๊ะค้างเก่า
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'POS ร้านอาหาร',
        short_name: 'POS',
        description: 'ระบบ POS ร้านอาหาร + สั่งอาหารผ่าน QR',
        lang: 'th',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // cache เฉพาะ static asset ของแอป — ห้าม cache /api (ข้อมูลต้องสด)
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
