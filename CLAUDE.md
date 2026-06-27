# CLAUDE.md

แนวทางการทำงานสำหรับ Claude Code ในโปรเจกต์นี้ (POS ร้านอาหาร).

## Git workflow

- **commit และ push เข้า branch `main` โดยตรงเสมอ** — ไม่ต้องแตก feature branch
  ก่อน เมื่อได้รับคำสั่งจากผู้ใช้ผ่าน Claude (ผู้ใช้รับความเสี่ยงของการทำงานบน
  main เอง).
- commit/push เฉพาะตอนที่ผู้ใช้สั่งเท่านั้น.
- ปิดท้าย commit message ด้วย:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

## โครงสร้างโปรเจกต์

- `backend/` — NestJS + Prisma (PostgreSQL), multi-tenant ตาม `shopId`.
- `web/` — React 19 + Vite + Tailwind + Zustand, ภาษาไทยเป็นหลัก.

## ตรวจงานก่อนถือว่าเสร็จ

- ฝั่ง web: `cd web && npm run build` (รวม `tsc -b` + vite build) ต้องผ่าน.
- โปรเจกต์ไม่ได้ตั้ง ESLint — ใช้ TypeScript compiler เป็นตัวตรวจหลัก.
