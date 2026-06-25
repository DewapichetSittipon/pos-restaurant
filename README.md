# POS Restaurant + QR Self-Ordering

ระบบ POS ร้านอาหารแบบ Multi-tenant SaaS ที่ให้พนักงานเปิดโต๊ะและสร้าง QR Code ให้ลูกค้าสแกนสั่งอาหารเองจากมือถือ พร้อมแจ้งเตือนครัวและหน้าร้านแบบ real-time

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + Prisma ORM |
| Frontend | React 19 + Vite + Tailwind CSS |
| Database | PostgreSQL |
| Real-time | Socket.IO |
| Auth | JWT (HttpOnly Cookie) |

## Features

- **QR Self-Ordering** — ลูกค้าสแกน QR สั่งอาหารเองจากมือถือ ไม่ต้องรอพนักงาน
- **Real-time Kitchen Display** — ครัวเห็นออเดอร์ใหม่ทันทีผ่าน WebSocket
- **Staff Dashboard** — ผังโต๊ะ real-time เปิดโต๊ะ / เช็คบิล / รับเรื่องเรียกพนักงาน
- **EOD Report** — สรุปยอดขายประจำวัน
- **Multi-tenant** — รองรับหลายร้านในระบบเดียว แต่ละร้านแยก scope กันสมบูรณ์
- **Stock Management** — จัดการสต็อกเมนู + soft delete เพื่อรักษาประวัติบิล

## Project Structure

```
pos-res/
├── backend/          # NestJS API (port 3333)
│   ├── src/
│   │   ├── auth/         # JWT login
│   │   ├── tables/       # จัดการโต๊ะ + QR token
│   │   ├── menus/        # เมนู + รูปภาพ
│   │   ├── categories/   # หมวดหมู่เมนู
│   │   ├── orders/       # ออเดอร์ลูกค้า
│   │   ├── service-requests/ # เรียกพนักงาน / เรียกบิล
│   │   ├── reports/      # EOD report
│   │   ├── health/       # Health check endpoint
│   │   └── admin/        # Platform admin
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
├── web/              # React SPA (port 5173)
│   └── src/
│       └── pages/
│           ├── TablePage.tsx        # หน้าลูกค้าสั่งอาหาร (QR)
│           ├── AdminGridPage.tsx    # ผังโต๊ะหน้าร้าน
│           ├── KitchenPage.tsx      # จอครัว
│           ├── ManagePage.tsx       # จัดการเมนู/โต๊ะ
│           ├── EodReportPage.tsx    # รายงานยอดขาย
│           └── LoginPage.tsx        # พนักงานล็อกอิน
└── shared/           # Types & Enums ใช้ร่วมกัน
```

## เริ่มใช้งาน (Local Dev)

### Prerequisites
- Node.js 20+
- Docker (สำหรับ PostgreSQL)

### Setup

```bash
# 1. ติดตั้ง dependencies ทุก workspace
npm install

# 2. สตาร์ท PostgreSQL
docker compose up -d

# 3. Setup Backend
cd backend
npx prisma migrate dev    # สร้างตาราง
npx prisma db seed        # ใส่ข้อมูลตัวอย่าง
npm run start:dev         # http://localhost:3333/api

# 4. Setup Frontend (terminal ใหม่)
cd web
npm run dev               # http://localhost:5173
```

### Environment Variables (backend/.env)

```env
DATABASE_URL="postgresql://posres:posres@localhost:5433/posres?schema=public"
JWT_SECRET="dev-secret-change-me"
JWT_EXPIRES_IN="12h"
PORT=3333
CORS_ORIGIN="http://localhost:5173"
```

## บัญชีทดสอบ (จาก seed)

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin — จัดการโต๊ะ/เมนู/เช็คบิล/ดูรายงาน |
| `kitchen` | `kitchen123` | Kitchen — ดูออเดอร์และเปลี่ยนสถานะอาหาร |

## การใช้งาน QR Ordering

1. Login เป็น admin → ไปที่ผังโต๊ะ
2. กด **เปิดโต๊ะ** — ระบบสร้าง QR Code อัตโนมัติ
3. ลูกค้าสแกน QR → สั่งอาหารจากมือถือได้เลย
4. ครัวเห็นออเดอร์ใหม่แบบ real-time
5. เมื่อลูกค้าพร้อม → กด **เช็คบิล** จากผังโต๊ะ

## Deployment

| Service | Platform |
|---------|----------|
| Database | Supabase (PostgreSQL) |
| Backend | Render |
| Frontend | Cloudflare Pages |

### Environment Variables (Production)

**Backend (Render):**
```env
DATABASE_URL=        # Supabase connection string
JWT_SECRET=          # สุ่มค่าใหม่ที่แข็งแกร่ง
JWT_EXPIRES_IN=12h
NODE_ENV=production
CORS_ORIGIN=         # URL ของ Cloudflare Pages
```

**Frontend (Cloudflare Pages):**
```env
VITE_API_URL=        # URL ของ Render backend
```

## Notes

- เงินเก็บเป็น **integer หน่วยสตางค์** ทุกที่ (เลี่ยง float rounding)
- PostgreSQL map container port `5432` → host `5433` (เลี่ยงชน local Postgres)
- Backend ใช้ port `3333`
- ดูคำศัพท์ domain model เพิ่มเติมที่ [CONTEXT.md](./CONTEXT.md)
