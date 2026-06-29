---
name: backend-tenant-change
description: Checklist บังคับเมื่อแก้/เพิ่ม Prisma query, service method, หรือ API endpoint ฝั่ง backend ในโปรเจกต์ POS นี้ — กันบั๊กเงียบเรื่อง multi-tenant (shopId), เงินเป็นสตางค์, snapshot, promotion engine, และ soft delete. โหลด skill นี้ก่อนเขียน/รีวิวโค้ด backend ที่แตะข้อมูลร้าน (orders, menus, members, reports, promotions ฯลฯ).
---

# Backend tenant-scoped change — checklist

โหลด skill นี้ **ก่อน** เขียนหรือรีวิว Prisma query / service / endpoint ใดก็ตามที่
อ่าน-เขียนข้อมูลของร้าน. นี่คือคลาสบั๊กที่แพงสุดของโปรเจกต์ (data leak ข้ามร้าน +
คิดเงินผิดหน่วย) และ TypeScript compiler จับให้ไม่ได้.

## 1. Multi-tenant — scope ด้วย `shopId` เสมอ

- ทุก `prisma.*.findMany / findFirst / update / delete / count / aggregate` ต้องมี
  `where: { shopId, ... }`. **ห้าม** `findUnique` ด้วย id อย่างเดียวแล้วเชื่อว่าเป็น
  ของร้านนั้น — ตรวจ `shopId` ที่ได้คืนมาด้วย หรือใช้ `findFirst({ where: { id, shopId } })`.
- `shopId` มาจาก context ของผู้ใช้ที่ล็อกอิน (decorator/guard ใน `auth/`) — **อย่า**
  รับ `shopId` จาก request body/param ของลูกค้าตรงๆ.
- เขียน relation ใหม่ก็ต้องพา `shopId` ลงไปทุกแถว เพื่อให้ filter ได้ในชั้นถัดไป.
- ก่อนถือว่าเสร็จ: ไล่ดูทุก query ใน method ว่า "ถ้าผู้ใช้ร้าน A เรียก จะเห็น/แก้
  ข้อมูลร้าน B ได้ไหม" — ถ้าได้ = บั๊ก.

## 2. เงิน = สตางค์ (integer) เสมอ

- ค่าเงินทุกตัวใน DB และ API เป็น integer สตางค์ (25.50 บาท = `2550`). แปลงเป็นบาท
  เฉพาะตอนแสดงผลฝั่ง web.
- คำนวณบิล/ส่วนลด/ภาษี ใช้ฟังก์ชัน pure ใน `backend/src/common/bill-math.ts`
  (มี `bill-math.spec.ts`). อย่าคำนวณเลขเงินกระจายในหลาย service.
- ระวังหารแล้วได้ทศนิยม — ปัดให้ชัดเจน ไม่ปล่อยเป็น float สะสม error.

## 3. Snapshot ตอนสั่ง

- `OrderItem` ต้องเก็บ snapshot ณ ตอนสั่ง: `item_name`, `unit_price`, modifiers,
  combo. **อย่า** join กลับไปอ่านราคา/ชื่อจาก `Menu` ตอนออกบิลย้อนหลัง — เมนูอาจถูก
  แก้/archive ไปแล้ว.

## 4. Promotion ผ่าน engine

- ส่วนลด (happy hour / BOGO / สมาชิก / วันเกิด) คิดผ่าน
  `backend/src/common/promotion-math.ts` (pure fn, มี `.spec.ts`). อย่าฮาร์ดโค้ด
  ส่วนลดในบิลหรือ service — ให้ผ่าน engine เพื่อทดสอบได้และคิดเป็นสตางค์เหมือนกัน.

## 5. Soft delete / availability

- เมนูใช้ `is_archived` (soft delete) ไม่ hard-delete — รักษา FK ของบิลเก่า.
- `is_available` (สวิตช์ปิดขาย manual) แยกขาดจาก `stock_count`. อย่าเอามาปนกัน.

## 6. สถานะอาหาร + real-time

- สถานะ: `queued → cooking → served` (+ `voided`). ใช้คำว่า **queued** ไม่ใช่
  "pending" (กันชนกับ `Bill.pending`).
- เปลี่ยนสถานะ/สั่งใหม่ ต้องยิง Socket.IO event ด้วย — ชื่อ event ฝั่ง backend อยู่ที่
  `backend/src/events/socket.constants.ts`, ฝั่ง web ที่ `web/src/services/socket.ts`
  (`SOCKET_EVENTS`). อย่าให้ทั้งสองฝั่งหลุดจากกัน.

## 7. i18n (ถ้าแตะเมนูฝั่งลูกค้า)

- ชื่อ/คำอธิบายหลายภาษา (TH/EN/ZH) เก็บเป็น `TranslatedName`; **ไทยเป็น fallback
  เสมอ**. resolve ภาษาใน `backend/src/common/i18n.ts`.

## ก่อนถือว่าเสร็จ

- มีการเปลี่ยน schema → สร้าง migration (`npm run prisma:migrate`) และตรวจว่า apply
  แล้ว; ไล่ดู `backend/prisma/migrations/` ว่าไม่มีตัวค้าง.
- `cd backend && npm test` ต้องผ่านเมื่อแตะ logic (โดยเฉพาะ `*-math.spec.ts`).
