# CLAUDE.md

คู่มือสำหรับ Claude Code ทำงานในโปรเจกต์นี้ — POS ร้านอาหาร + QR self-ordering
แบบ multi-tenant SaaS.

> เอกสารอ้างอิงที่มีอยู่แล้ว (อ่านก่อนเมื่อเกี่ยวข้อง อย่าเขียนซ้ำ):
> - `CONTEXT.md` — **ubiquitous language / domain model** (Bill, OrderItem, batch_id ฯลฯ)
> - `README.md` — ภาพรวมฟีเจอร์แยกตาม role
> - `docs/adr/` — บันทึกการตัดสินใจเชิงสถาปัตยกรรม
> - `docs/` — backup/restore, data retention, onboarding ร้านใหม่, thermal printing,
>   `user-manual.md` (คู่มือใช้งานแยกตาม role; มีหน้าในแอปที่ `web/src/pages/HelpPage.tsx`)

## Git workflow

- **commit และ push เข้า branch `main` โดยตรงเสมอ** — ไม่ต้องแตก feature branch
  ก่อน (ผู้ใช้รับความเสี่ยงของการทำงานบน main เอง).
- commit/push เฉพาะตอนที่ผู้ใช้สั่งเท่านั้น.
- ปิดท้าย commit message ด้วย:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

## โครงสร้าง (monorepo)

| โฟลเดอร์ | คืออะไร |
|----------|---------|
| `backend/` | NestJS 11 + Prisma 6 (PostgreSQL) + Socket.IO + JWT (HttpOnly cookie) |
| `web/`     | React 19 + Vite + Tailwind + Zustand + react-router 7 (UI ภาษาไทย) |
| `shared/`  | โค้ด/ไทป์ที่ใช้ร่วมกันระหว่าง backend กับ web |
| `docs/`    | เอกสาร + ADR + runbook |
| `scripts/` | `backup-db.sh` ฯลฯ |

backend แยกเป็น NestJS module ตาม domain: `auth`, `orders`, `menus`, `tables`,
`categories`, `members`, `reports`, `reservations`, `shifts`, `service-requests`,
`shop`, `staff`, `signup`, `admin` (platform), `audit`, `events` (socket),
`notifications`, `uploads`, `promotions`, `health`. logic ที่ใช้ร่วม (เงิน/โปรโมชั่น/
i18n/observability) อยู่ใน `backend/src/common/` เช่น `bill-math.ts`,
`promotion-math.ts`, `i18n.ts`.

## คำสั่งที่ใช้บ่อย

**Backend** (`cd backend`)
```bash
npm run start:dev        # dev server + watch
npm run prisma:migrate   # สร้าง/รัน migration (dev)
npm run prisma:seed      # seed ข้อมูล (มีร้านตัวอย่าง shopa/shopb)
npm run prisma:studio    # เปิด Prisma Studio
npm test                 # vitest
```

**Web** (`cd web`)
```bash
npm run dev        # vite dev server
npm run build      # tsc -b && vite build — ใช้ตัวนี้เช็คก่อนถือว่าเสร็จ
npm test           # vitest
```

ทั้งโปรเจกต์รันพร้อมกันได้ด้วย `docker-compose.yml` (มี Postgres ให้).

## Conventions ที่ต้องรู้ (พลาดง่าย)

- **เงินเก็บเป็น "สตางค์" (integer)** เสมอ ทั้ง DB และ API — ไม่ใช่ทศนิยมบาท.
  เช่น 25.50 บาท = `2550`. แปลงเป็นบาทตอนแสดงผลเท่านั้น.
- **Multi-tenant ด้วย `shopId`** — ทุก query ฝั่ง backend ต้อง scope ตาม shop
  ของผู้ใช้ อย่า query ข้ามร้าน.
- **Snapshot ตอนสั่ง** — `OrderItem` เก็บ `item_name` + `unit_price` (และ
  modifiers/combo) ณ ตอนสั่ง เพื่อให้บิลย้อนหลังถูกแม้เมนูเปลี่ยนทีหลัง.
- **Soft delete** — เมนูใช้ `is_archived` ไม่ hard-delete (รักษา FK ของบิลเก่า).
- **`is_available` ≠ stock** — สวิตช์ปิดขาย manual แยกจาก `stock_count`
  (ดูนิยามใน `CONTEXT.md`).
- **`batch_id`** — UUID ที่ OrderItem กลุ่มที่กดส่งพร้อมกันแชร์กัน ใช้จัด
  "ticket" ให้ครัว และ "รอบที่ 1/2.." ให้ลูกค้า (ไม่ใช่ตารางแยก).
- **สถานะอาหาร**: `queued → cooking → served` (+ `voided`). ใช้ "queued"
  ไม่ใช่ "pending" (กันชนกับ Bill.pending).
- **Real-time** — เปลี่ยนสถานะ/สั่งใหม่ ยิงผ่าน Socket.IO; ชื่อ event อยู่ที่
  `web/src/services/socket.ts` (`SOCKET_EVENTS`).
- **Promotion engine แบบมีกฎ** — happy hour / BOGO / สมาชิก / วันเกิด คิดส่วนลดผ่าน
  `backend/src/common/promotion-math.ts` (pure fn, มี `.spec.ts`). อย่าฮาร์ดโค้ดส่วนลด
  ในบิล — ให้ผ่าน engine เพื่อให้ทดสอบได้และคิดเป็นสตางค์เหมือนกัน.
- **i18n เมนูฝั่งลูกค้า** — รองรับ ไทย/อังกฤษ/จีน; **ไทยเป็น fallback เสมอ**. ชื่อ/
  คำอธิบายแบบหลายภาษาเก็บใน DB (migration `menu_i18n`) เป็น `TranslatedName`. ฝั่ง web
  ใช้ `web/src/i18n/` (`useLangStore`, persist ที่ localStorage `pos.lang`); ฝั่ง backend
  resolve ภาษาใน `common/i18n.ts`.

## ตรวจงานก่อนถือว่าเสร็จ

- ฝั่ง web: `cd web && npm run build` ต้องผ่าน (รวม typecheck).
- ฝั่ง backend: `cd backend && npm test` เมื่อแตะ logic.
- โปรเจกต์ **ไม่ได้ตั้ง ESLint** — ใช้ TypeScript compiler เป็นตัวตรวจหลัก.
- migration ใหม่ต้องรัน/ตรวจก่อน merge; ดูสถานะที่ยังไม่ได้ apply ใน
  `backend/prisma/migrations/`.
