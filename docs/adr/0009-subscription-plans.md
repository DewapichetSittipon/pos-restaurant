# Subscription plan เก็บเงินค่าใช้แพลตฟอร์มจากร้าน (tenant billing)

ระบบเป็น multi-tenant SaaS — ร้านสมัครผ่าน `signup` (Shop เริ่มที่ `pending`) แล้ว admin อนุมัติเป็น
`active`. เดิมไม่มีการคิดเงินค่าใช้แพลตฟอร์ม ทุกร้านได้ฟีเจอร์เต็มเหมือนกัน

**ตัดสินใจ:** เพิ่ม **plan แบบเหมารายเดือน 3 ขั้น (ฟรี / โปร / ธุรกิจ)** ที่ปลดล็อกฟีเจอร์ + เพดาน
resource ต่างกัน โดย:

- `Plan` เป็น **ข้อมูลใน DB ไม่ใช่ hardcode** — ถือ `features` (รายการ feature key) + `limits`
  (`maxStaff`/`maxTable`/`maxMenu`, `null` = ไม่จำกัด) + `priceMonthly` (**สตางค์**) ปรับราคา/โควต้า
  ได้โดยไม่ deploy.
- `Shop` เพิ่มสถานะ billing **แยกจาก `ShopStatus` เดิม** — `planId`, `subscriptionStatus`
  (`trialing/active/past_due/canceled`), `currentPeriodEnd`, `trialEndsAt`. `ShopStatus` ยังเป็น
  สถานะ "อนุมัติให้ใช้ระบบ" (pending/active) ไม่ใช่สถานะจ่ายเงิน — ร้าน active แต่ plan หมดอายุได้.
- **บังคับสิทธิ์ที่เดียว**: helper `assertFeature(shop, key)` + `assertWithinLimit(shop, resource, count)`
  เรียกใน service ก่อนสร้าง resource → เกินสิทธิ์ตอบ `402 Payment Required`. ต้อง scope `shopId`
  ตามกติกา multi-tenant เดิม.
- **เฟสแรกเปิดใช้แบบ manual** — ไม่มี payment gateway. ร้านโอน/แจ้ง แล้ว platform admin กดเปลี่ยน
  `planId` + ตั้ง `currentPeriodEnd`. ต่อ gateway (Stripe/Omise) recurring เป็นงานเฟสถัดไป โดยไม่ต้องแก้
  โครงสร้าง enforcement.

**โมเดลราคา = เหมาตาม tier (flat) ไม่ใช่ usage-based metered** — เจ้าของร้านต้องตั้งงบล่วงหน้าได้
และเราไม่อยาก reconcile usage ต่อบิล/ออเดอร์ให้แม่นระดับบัญชี. "การใช้งาน" มาในรูปเพดาน resource
(staff/table/menu) + การปลดล็อกฟีเจอร์ ไม่ใช่คิดต่อหน่วย. ถ้าต้องการ usage-based จริงค่อยเติมเป็น
add-on มิติเดียว (เช่น จำนวนสาขา) แบบ base + overage ภายหลัง.

**มิติที่ใช้แบ่ง tier** (ตั้งต้น ปรับได้ใน DB):

| ฟีเจอร์ / เพดาน | ฟรี | โปร | ธุรกิจ |
|---|:---:|:---:|:---:|
| POS core (สั่ง/เช็คบิล/โต๊ะ/QR) | ✅ | ✅ | ✅ |
| Staff / Table / Menu | 3 / 10 / 30 | ∞ | ∞ |
| รายงานย้อนหลัง + export | — | ✅ | ✅ |
| Promotion engine | — | ✅ | ✅ |
| สมาชิก/สะสมแต้ม (loyalty) | — | ✅ | ✅ |
| เมนูหลายภาษา (i18n) | — | ✅ | ✅ |
| จองโต๊ะ / กะ / ESC/POS print / VAT | — | ✅ | ✅ |
| หลายสาขา | — | — | ✅ |

**เหตุผล:** monetize แพลตฟอร์มโดยให้ราคาคาดเดาได้สำหรับเจ้าของร้าน, เก็บ plan ใน DB เพื่อปรับ
packaging โดยไม่ deploy, แยกสถานะ billing ออกจากสถานะอนุมัติเพื่อไม่ทำ logic เดิมพัง, และเลื่อนงาน
payment gateway ออกไปได้โดยไม่ block การเปิดขาย.
