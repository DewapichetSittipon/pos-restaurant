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

## ฟีเจอร์แยกตาม Role

ระบบมี 5 มุมมองผู้ใช้: ผู้ดูแลแพลตฟอร์ม, เจ้าของร้าน (OWNER), พนักงานเสิร์ฟ (WAITER), ครัว (KITCHEN) และลูกค้า (สแกน QR — ไม่มีบัญชี)

### 🏢 ผู้ดูแลแพลตฟอร์ม (Platform Admin)
ล็อกอินแยก (`/platform/login`) อยู่เหนือทุกร้าน
- สร้างร้านใหม่ / ดูรายการร้านทั้งหมด
- อนุมัติร้านที่สมัครเข้ามาเอง (pending → active) — มี badge แจ้งเตือนจำนวนร้านที่รออนุมัติ
- รีเซ็ตรหัสผ่านพนักงานของแต่ละร้าน

### 👑 เจ้าของร้าน (OWNER)
เห็นและทำได้ทุกอย่างในร้านตัวเอง

**ผังโต๊ะ / เช็คบิล**
- เปิดโต๊ะ → สร้าง QR Code อัตโนมัติ
- เช็คบิล: ส่วนลด · วิธีชำระ (เงินสด/โอน) · เงินทอน · **VAT** · **เซอร์วิสชาร์จ** · **แลก/สะสมแต้มสมาชิก** · QR PromptPay
- ย้ายโต๊ะ · **รวมบิล** · **แยกบิล** (ลูกค้าจ่ายแยก)
- คีย์ออเดอร์ให้โต๊ะ · ดูรายการที่โต๊ะสั่ง · รับเรื่อง "เรียกพนักงาน/เรียกบิล"

**ครัว** — ดูคิว, เปลี่ยนสถานะอาหาร, ยกเลิก (void) พร้อมเหตุผล

**กะ / เงินลิ้นชัก** — เปิดกะ (เงินตั้งต้น) · ปิดกะ (นับเงินจริง → คำนวณเงินเกิน/ขาด) · ประวัติกะ

**จองโต๊ะ** — เพิ่ม/ดูการจองรายวัน, สถานะ จองไว้ → มาแล้ว/ยกเลิก

**รายงานยอดขาย**
- สรุปยอดวัน (EOD) · แยกเงินสด/โอน/VAT/เซอร์วิส
- เมนูขายดี · เวลาเตรียมอาหารเฉลี่ย · **ยอดรายชั่วโมง** · **ยอดช่วงวันที่ (สัปดาห์/เดือน)**
- **ดาวน์โหลด CSV** · ดูรายละเอียดบิลย้อนหลัง · พิมพ์ใบเสร็จซ้ำ · **คืนเงิน (refund)**

**จัดการร้าน**
- โต๊ะ · หมวดหมู่ · เมนู (รูป/ราคา/สต็อก/เปิด-ปิดขาย)
- ข้อมูลร้าน (หัวใบเสร็จ · PromptPay · VAT · เซอร์วิสชาร์จ · อัตราแต้มสมาชิก)
- พนักงาน (เพิ่ม/ลบ/รีเซ็ตรหัส/กำหนด role) · สมาชิก · **บันทึกการกระทำ (audit log)** · บัญชีของตัวเอง

### 🧑‍🍳 พนักงานเสิร์ฟ (WAITER)
เห็น: **ผังโต๊ะ · กะ/ลิ้นชัก · จองโต๊ะ**
- ทำงานหน้าโต๊ะได้ทั้งหมด (เปิดโต๊ะ/เช็คบิล/ย้าย/รวม/แยกบิล/คีย์ออเดอร์/void)
- เปิด-ปิดกะ · จองโต๊ะ · ค้นหา/สมัครสมาชิกตอนเช็คบิล
- ❌ ไม่เห็นรายงานยอดขาย และหน้าจัดการร้าน (เมนู/พนักงาน/audit)

### 🍳 ครัว (KITCHEN)
เห็น: **หน้าครัวเท่านั้น**
- ดูคิวออเดอร์ใหม่แบบ real-time
- เปลี่ยนสถานะอาหาร: รอคิว → กำลังทำ → เสิร์ฟแล้ว
- ยกเลิก (void) รายการพร้อมเหตุผล (คืนสต็อกถ้ายังไม่เริ่มทำ)

### 📱 ลูกค้า (สแกน QR — ไม่มีบัญชี)
- สแกน QR ที่โต๊ะ → สั่งอาหารจากมือถือเอง
- ดูรายการที่สั่ง + **สถานะอาหารแบบสด** (รอคิว/กำลังทำ/เสิร์ฟแล้ว)
- กดเรียกพนักงาน / เรียกเช็คบิล

## Roles & Permissions (สรุป)

| ฟีเจอร์ | OWNER | WAITER | KITCHEN |
|---|:---:|:---:|:---:|
| ผังโต๊ะ / เปิดโต๊ะ / เช็คบิล | ✅ | ✅ | — |
| ย้าย / รวม / แยกบิล | ✅ | ✅ | — |
| คีย์ออเดอร์ให้โต๊ะ | ✅ | ✅ | — |
| หน้าครัว / เปลี่ยนสถานะอาหาร / void | ✅ | — | ✅ |
| กะ / เงินลิ้นชัก | ✅ | ✅ | — |
| จองโต๊ะ | ✅ | ✅ | — |
| สมาชิก (ค้น/สมัครตอนเช็คบิล) | ✅ | ✅ | — |
| รายงานยอดขาย / คืนเงิน / CSV | ✅ | — | — |
| จัดการเมนู / โต๊ะ / ข้อมูลร้าน | ✅ | — | — |
| จัดการพนักงาน / audit log | ✅ | — | — |

## Project Structure

```
pos-res/
├── backend/                  # NestJS API (port 3333)
│   ├── src/
│   │   ├── auth/             # JWT login + role guards
│   │   ├── tables/          # โต๊ะ + QR + เช็คบิล + ย้าย/รวม/แยกบิล
│   │   ├── menus/           # เมนู + รูปภาพ
│   │   ├── categories/      # หมวดหมู่เมนู
│   │   ├── orders/          # ออเดอร์ลูกค้า/พนักงาน + คิวครัว + void
│   │   ├── service-requests/# เรียกพนักงาน / เรียกบิล
│   │   ├── shifts/          # กะ / เงินลิ้นชัก
│   │   ├── reservations/    # จองโต๊ะ
│   │   ├── members/         # สมาชิก / แต้มสะสม
│   │   ├── reports/         # EOD, รายชั่วโมง, ช่วงวันที่, CSV, refund
│   │   ├── audit/           # บันทึกการกระทำ (global module)
│   │   ├── shop/            # ตั้งค่าร้าน (VAT/service/แต้ม/หัวใบเสร็จ)
│   │   ├── staff/           # จัดการพนักงาน
│   │   ├── signup/          # ร้านสมัครเปิดเอง
│   │   ├── uploads/         # อัปโหลดรูปเมนู
│   │   ├── common/          # bill-math (สูตรส่วนลด/เซอร์วิส/VAT)
│   │   └── admin/           # Platform admin
│   └── prisma/
│       ├── schema.prisma
│       ├── migrations/
│       └── seed.ts
├── web/                      # React SPA (port 5173)
│   └── src/
│       ├── pages/
│       │   ├── TablePage.tsx        # ลูกค้าสั่งอาหาร (QR)
│       │   ├── AdminGridPage.tsx    # ผังโต๊ะหน้าร้าน
│       │   ├── KitchenPage.tsx      # จอครัว
│       │   ├── ShiftPage.tsx        # กะ / เงินลิ้นชัก
│       │   ├── ReservationPage.tsx  # จองโต๊ะ
│       │   ├── ManagePage.tsx       # จัดการร้าน (แท็บ)
│       │   ├── EodReportPage.tsx    # รายงานยอดขาย
│       │   └── PlatformDashboardPage.tsx # ผู้ดูแลแพลตฟอร์ม
│       ├── components/manage/       # แท็บจัดการ (เมนู/พนักงาน/สมาชิก/audit/ข้อมูลร้าน)
│       └── utils/billMath.ts        # สูตรคิดบิล (คู่กับ backend)
└── shared/                  # Types & Enums ใช้ร่วมกัน
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
npx prisma migrate dev    # สร้าง/อัปเดตตาราง (รัน migration ทั้งหมด)
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

| Username | Password | บทบาท |
|----------|----------|------|
| `superadmin` | `super123` | ผู้ดูแลแพลตฟอร์ม (login ที่ `/platform/login`) |
| `shopa` | `shopa123` | เจ้าของร้าน A (OWNER) |
| `shopb` | `shopb123` | เจ้าของร้าน B (OWNER) |

> พนักงานที่สมัคร/สร้างใหม่ทุกคนเริ่มที่ role **OWNER** — เปลี่ยนเป็น WAITER/KITCHEN ได้ในแท็บ "พนักงาน"

## การใช้งาน QR Ordering

1. Login เป็นเจ้าของร้าน → ไปที่ผังโต๊ะ
2. กด **เปิดโต๊ะ** — ระบบสร้าง QR Code อัตโนมัติ
3. ลูกค้าสแกน QR → สั่งอาหารจากมือถือได้เลย เห็นสถานะอาหารแบบสด
4. ครัวเห็นออเดอร์ใหม่แบบ real-time → เปลี่ยนสถานะ
5. เมื่อลูกค้าพร้อม → กด **เช็คบิล** จากผังโต๊ะ (ส่วนลด/VAT/แต้ม/พิมพ์ใบเสร็จ)

## Deployment

| Service | Platform |
|---------|----------|
| Database | Supabase (PostgreSQL) |
| Backend | Render |
| Frontend | Cloudflare Pages |

ก่อน deploy ทุกครั้งที่มี migration ใหม่ ให้รัน `npx prisma migrate deploy` กับ production DB

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
VITE_SENTRY_DSN=     # (ออปชัน) error tracking ฝั่ง web — ไม่ตั้ง = ปิด
```

**Backend — ออปชันเสริม (ไม่ตั้ง = ปิดฟีเจอร์นั้นเงียบ ๆ):**
```env
SENTRY_DSN=                  # error tracking ฝั่ง backend
LINE_CHANNEL_ACCESS_TOKEN=   # แจ้งเตือน LINE (push)
LINE_TARGET_ID=
SMTP_URL=                    # แจ้งเตือน Email
ALERT_EMAIL_TO=
```

## Ops & Production-readiness

- **Tests** — `npm test -w backend` / `-w web` (Vitest) ครอบสูตรคิดบิลทุกเคส (VAT/เซอร์วิส/ส่วนลด/ปัดเศษ)
- **DB backup** — สำรองอัตโนมัติรายวันผ่าน GitHub Actions → ดู [docs/backup-and-restore.md](./docs/backup-and-restore.md)
- **Error tracking** — Sentry (env-gated) + global exception filter พร้อม structured logging
- **แจ้งเตือน** — LINE/Email เมื่อมีร้านสมัครใหม่ / การจองใหม่ (env-gated)
- **PWA** — ติดตั้งลงเครื่องได้ + แถบเตือนออฟไลน์
- **ใบกำกับภาษี** — เลขที่ใบเสร็จรันต่อเนื่องต่อร้าน (ใส่เลขผู้เสียภาษี → ออกเป็น "ใบกำกับภาษีอย่างย่อ")

### เอกสารเพิ่มเติม
- [เปิดร้านใหม่ (Onboarding)](./docs/onboarding-new-shop.md)
- [สำรอง/กู้คืนฐานข้อมูล](./docs/backup-and-restore.md)
- [การพิมพ์ใบเสร็จ (Thermal)](./docs/thermal-printing.md)
- [นโยบายเก็บ/ลบข้อมูล](./docs/data-retention.md)

## Notes

- เงินเก็บเป็น **integer หน่วยสตางค์** ทุกที่ (เลี่ยง float rounding); อัตรา VAT/เซอร์วิสเก็บเป็น **basis points** (700 = 7%)
- สูตรคิดบิล (ส่วนลด → เซอร์วิส → VAT) มีสำเนาคู่กันที่ `backend/src/common/bill-math.ts` และ `web/src/utils/billMath.ts` — แก้ต้องแก้ทั้งสองที่
- PostgreSQL map container port `5432` → host `5433` (เลี่ยงชน local Postgres)
- Backend ใช้ port `3333`
- ดูคำศัพท์ domain model เพิ่มเติมที่ [CONTEXT.md](./CONTEXT.md)
