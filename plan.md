# ระบบ POS ร้านอาหาร + สั่งอาหารด้วย QR Code

เอกสารนี้คือแผนหลังผ่าน grilling session แล้ว (อัปเดต 2026-06-24) — สรุปการตัดสินใจทั้งหมด
ดูศัพท์เฉพาะที่ [`CONTEXT.md`](./CONTEXT.md) และเหตุผลเชิงสถาปัตยกรรมที่ [`docs/adr/`](./docs/adr/)

---

## 🛠️ Tech Stack

- **Frontend:** Vite + React + TypeScript + React Router + Tailwind CSS (SPA, mobile-first) — _เปลี่ยนจาก Next.js, ดู ADR-0004_
  - State: **zustand** (`src/store`)
  - Data fetching: **axios** (`src/services`)
  - โครง `src/`: `pages`, `routes`, `components`, `store`, `type`, `utils`, `services`, `styles`, `hooks`
  - กฎ: **ห้ามเขียน `type`/`interface` ใน `.tsx`** ยกเว้น props — type อื่นไปอยู่ `src/type`
- **Backend:** **NestJS** + TypeScript (REST + Socket.io gateway) — _ดู ADR-0005_
- **Real-time:** Socket.io — **push อย่างเดียว** (server → client), ทุก action ผ่าน REST — _ดู ADR-0006_
- **Database:** PostgreSQL ผ่าน Prisma ORM (ไม่ใช้ Redis/caching ใน v1)
- **Auth:** JWT ใน httpOnly cookie สำหรับ Staff, verify ตอน socket handshake ด้วย
- **เงิน:** เก็บเป็น **Integer หน่วยสตางค์** ทุกที่ (เลี่ยง float rounding)
- **โครงโปรเจกต์:** monorepo (npm workspaces) — `backend`, `web`, `shared`

---

## 🗄️ โครงสร้างฐานข้อมูล (Prisma / PostgreSQL)

### Table — โต๊ะอาหาร
| field | type | หมายเหตุ |
|-------|------|---------|
| id | Int / cuid | PK |
| table_number | String | unique |
| status | enum `vacant \| occupied` | สถานะเรียกพนักงาน/เช็คบิลแยกไปที่ ServiceRequest |

### Category — หมวดหมู่เมนู
| field | type | หมายเหตุ |
|-------|------|---------|
| id | PK | |
| name | String | |

### Menu — รายการอาหาร
| field | type | หมายเหตุ |
|-------|------|---------|
| id | PK | |
| category_id | FK → Category | |
| name | String | |
| price | Int | **สตางค์** |
| stock_count | Int? | **nullable** = ไม่นับสต็อก |
| is_available | Boolean | สวิตช์ manual (อิสระจาก stock) |
| is_archived | Boolean | **soft delete** — ไม่ hard-delete (ADR-0008) |

### Bill — รอบบิลของลูกค้าหนึ่งกลุ่ม _(เดิมชื่อ Transaction)_
| field | type | หมายเหตุ |
|-------|------|---------|
| id | PK | |
| table_id | FK → Table | หนึ่งโต๊ะมี Bill `pending` ได้ทีละหนึ่ง |
| total_price | Int? | สตางค์ — snapshot ตอน checkout (ADR-0003) |
| status | enum `pending \| paid` | |
| qr_token | String (UUID) | unique; invalidate โดยอิง `status` (ADR ไม่ null ค่า) |
| created_at | DateTime | |
| paid_at | DateTime? | เซ็ตตอน checkout — ฐานของ EOD (ADR-0007) |

### OrderItem — อาหารหนึ่งจานในรอบบิล
| field | type | หมายเหตุ |
|-------|------|---------|
| id | PK | |
| bill_id | FK → Bill | |
| menu_id | FK → Menu | |
| batch_id | String (UUID) | จัดกลุ่ม "รอบการสั่ง" (ADR ใน CONTEXT) |
| quantity | Int | |
| unit_price | Int | **สตางค์** — snapshot ตอนสั่ง (ADR-0003) |
| item_name | String | snapshot ชื่อตอนสั่ง (ADR-0008) |
| status | enum `queued \| cooking \| served \| voided` | _เลี่ยง pending ที่ชนกับ Bill_ |
| created_at | DateTime | เวลาสั่ง |
| served_at | DateTime? | เวลาเสิร์ฟ (เซ็ตตอน status → served) |

### Staff — พนักงานหลังบ้าน _(ใหม่)_
| field | type | หมายเหตุ |
|-------|------|---------|
| id | PK | |
| username | String | unique |
| password_hash | String | |
| role | enum `admin \| kitchen` | |

### ServiceRequest — คำขอจากโต๊ะ _(ใหม่)_
| field | type | หมายเหตุ |
|-------|------|---------|
| id | PK | |
| bill_id | FK → Bill | |
| type | enum `call_staff \| call_bill` | |
| status | enum `pending \| acknowledged` | |
| created_at | DateTime | |

---

## 🔑 กฎทางธุรกิจสำคัญ (จาก grilling)

1. **สต็อก (ADR-0001):** หักสต็อก **ตอนสั่ง** แบบ atomic (`UPDATE ... WHERE stock_count >= qty`) ใน transaction
   เดียวกับการสร้าง OrderItem — ถ้ากระทบ 0 แถว = ของหมด ปฏิเสธทั้งออเดอร์ checkout ไม่ยุ่งกับสต็อก
2. **Void (ADR-0002):** พนักงานเท่านั้น void OrderItem ได้ เฉพาะตอน `queued` → คืน stock; `cooking` แล้ว void ไม่ได้;
   ลูกค้ายกเลิกเองไม่ได้
3. **Snapshot (ADR-0003, 0008):** OrderItem เก็บ `unit_price` + `item_name` ตอนสั่ง; Bill เก็บ `total_price` ตอน checkout
4. **availability:** ซื้อได้เมื่อ `is_available = true` และ (`stock_count > 0` หรือ `stock_count = null`); stock=0 แสดง "หมด"
   ไม่แตะ is_available
5. **token:** validate = token ตรง Bill ที่มีจริง + `Bill.status = pending` + `table_id` ตรง URL; checkout → paid = token ตาย;
   ลูกค้าเห็นหน้า "ปิดบิลแล้ว"
6. **เช็คบิล:** เช็คได้เสมอ, `voided` ไม่นับยอด, ถ้ามีของ `queued`/`cooking` ค้าง → admin เตือนยืนยัน;
   เปิดโต๊ะที่ occupied ซ้ำ → 409
7. **multi-device:** ตะกร้าแยกตามเครื่อง (local), ประวัติการสั่ง (history) แชร์ทั้งโต๊ะแบบ real-time

---

## 🌐 Real-time (ADR-0006)

- ทุก mutation ผ่าน REST; Socket.io push event อย่างเดียว
- Rooms: `table:{billId}` (ลูกค้า), `kitchen`, `admin`
- Events: `order.created`, `orderItem.statusChanged`, `serviceRequest.created`, `serviceRequest.acknowledged`,
  `table.opened`, `bill.closed`

---

## 🗺️ ลำดับขั้นตอนการพัฒนา

### Phase 1: ฐานข้อมูล + ข้อมูลจำลอง + โครง backend ✅ (กำลังทำ)
- ตั้ง monorepo (npm workspaces): `backend`, `shared`, (`web` ทีหลัง)
- Prisma schema ตามตารางด้านบน
- `seed.ts`: โต๊ะ, หมวดหมู่, เมนู (+สต็อก), staff (admin/kitchen, รหัส hash)
- โครง NestJS + PrismaService เชื่อม Postgres

### Phase 2: Core API + Socket.io ✅ (เสร็จ + smoke test 23/23 ผ่าน)
- `POST /api/auth/login` — Staff login (JWT httpOnly cookie); + `POST /auth/logout`, `GET /auth/me`
- `POST /api/tables/:id/open` — เปิดโต๊ะ สร้าง Bill + qr_token + customerUrl (admin); 409 ถ้าเปิดซ้ำ
- `GET  /api/tables` — รายการโต๊ะ + บิล pending + service request (staff) สำหรับ grid
- `GET  /api/menus` — แคตตาล็อกแยกหมวด (ไม่รวม archived)
- `GET  /api/customer/session` — มุมมองลูกค้า: บิล + order items (qr_token guard)
- `POST /api/orders` — ลูกค้าสั่ง: validate token, หักสต็อก atomic, snapshot ราคา/ชื่อ + batch_id, push
- `PATCH /api/orders/:id/status` — เปลี่ยนสถานะอาหาร (kitchen/admin) → push
- `POST /api/orders/:id/void` — void เฉพาะ queued (kitchen/admin, คืนสต็อก) → push
- `POST /api/service-requests` — ลูกค้าเรียกพนักงาน/เช็คบิล → push admin
- `PATCH /api/service-requests/:id/ack` — รับเรื่อง (staff) → push
- `POST /api/tables/:id/checkout` — รวมยอด, snapshot total_price, set paid + paid_at, push `bill.closed`
- Socket.io gateway: verify JWT/qr_token ตอน handshake, join rooms `kitchen`/`admin`/`table:{billId}`

### Phase 3: Customer Web App (React SPA) ✅ (เสร็จ + build ผ่าน)
- Route `/table/:tableId?token=...` — validate ผ่าน API (`GET /customer/session`); สถานะ loading/ready/invalid/closed
- เมนูแยกหมวด (CategoryTabs, mobile-first), แสดง "หมด"/"เหลือ N ที่"
- ตะกร้า local (zustand `cartStore`) + CartBar/CartDrawer + ส่งออเดอร์ (`POST /orders`)
- ประวัติการสั่ง group เป็น "รอบที่ N" + real-time ผ่าน socket (`order.created`, `orderItem.statusChanged`, `bill.closed`)
- ปุ่ม "เรียกพนักงาน" / "เรียกเช็คบิล"
- โครง `web/src/`: `type` (โดเมนรวมศูนย์), `services` (axios `api`/`customerApi`, `socket`), `store` (cart/session),
  `hooks` (useMenu/useCustomerSession), `utils` (money/menu), `components`, `pages`, `routes` — ไม่มี type ใน `.tsx` ยกเว้น props

### Phase 4: Admin & Kitchen Dashboard (React SPA) ✅ (เสร็จ + socket test 10/10 ผ่าน)
- Login พนักงาน (`/login`) → redirect ตาม role; ProtectedRoute + StaffLayout + NavBar
- ผังโต๊ะ (`/admin`): grid real-time (ว่าง/มีลูกค้า + การ์ดกระพริบเมื่อมี ServiceRequest), ปุ่มเปิดโต๊ะ/เช็คบิล/รับเรื่อง
- Live notification: toast (`toastStore`/`Toaster`) + เสียงเตือน WebAudio เมื่อ `order.created`/`serviceRequest.created`
- จอครัว (`/kitchen`): tickets group ตามโต๊ะ/รอบ, ปุ่ม `queued → cooking → served` (`GET /orders/active`)
- EOD report (`/admin/report`): เลือกวันที่, ยอดรวม + จำนวนบิล + ตารางบิล (`GET /reports/eod`, Asia/Bangkok, ADR-0007)
- staff socket เชื่อมด้วย JWT cookie → join `admin`/`kitchen` ตาม role

---

## ⚠️ ขอบเขตที่ตัดออกจาก v1 (รับทราบร่วมกัน)
- qr_token ใน query string รั่วได้ทาง referrer/log — ยอมรับสำหรับ dine-in
- ไม่มี Redis/caching, ไม่มี pagination
