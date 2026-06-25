# สถาปัตยกรรม: NestJS backend + React SPA (monorepo)

แผนเดิมระบุ Next.js (App Router) ฝั่ง frontend และ Node backend แยก แต่เมื่อมี NestJS เป็น backend แยกชัดเจน
การมี Next.js (ที่มี API routes/SSR/middleware) ทำให้เกิดความกำกวมว่า business logic อยู่ฝั่งไหน

**ตัดสินใจ:**
- **Backend:** NestJS เพียงตัวเดียวเป็นเจ้าของ REST API + Socket.io gateway + Prisma (ดู [[0005-backend-nestjs]])
- **Frontend:** React SPA (Vite + TypeScript + React Router + Tailwind) เป็น client ล้วน คุยกับ NestJS ที่เดียว
  รวมแอปลูกค้า (`/table/*`) และหลังบ้าน (`/admin/*`, `/kitchen/*`) ไว้ในแอปเดียว แยกด้วย route group
- **Monorepo (pnpm workspaces):** `backend`, `web`, `shared` (types + zod schemas ใช้ร่วมกัน)

**เหตุผล:** มี backend เดียวที่ชัดเจน, ไม่มี SSR/SEO ซึ่งไม่จำเป็นสำหรับ POS หลัง login/token,
และแชร์ type ข้ามฝั่งได้ผ่าน `shared`

**ผลที่ตามมา:** ไม่มี Next middleware ตรวจ token อีกต่อไป — การ validate qr_token ย้ายไปอยู่ที่ NestJS guard
ทุก request (สอดคล้องกับการผูก token กับ Bill.status ที่ตัดสินไปแล้ว)
