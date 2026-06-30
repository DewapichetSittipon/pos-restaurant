-- ปรับโครงสร้างแพ็กเกจเหลือ 2 ขั้น (รายเดือน): เริ่มต้น 99 / โปร 590 — ตัดฟรีและธุรกิจออก
-- 'free' = key เดิมของแพ็กเกจเริ่มต้น (ยังใช้เป็น fallback ตอน planId=NULL) เปลี่ยนแค่ชื่อ/ราคา

-- เริ่มต้น: เดิม "ฟรี" 0 บาท -> "เริ่มต้น" 99 บาท (9900 สตางค์)
UPDATE "plans" SET "name" = 'เริ่มต้น', "price_monthly" = 9900 WHERE "key" = 'free';

-- โปร: 390 -> 590 บาท (59000 สตางค์)
UPDATE "plans" SET "price_monthly" = 59000 WHERE "key" = 'pro';

-- ตัดแพ็กเกจธุรกิจ: เคลียร์คำขอ/การผูกที่อ้างถึงก่อน แล้วลบ
UPDATE "shops" SET "requested_plan_key" = NULL WHERE "requested_plan_key" = 'business';
-- ร้านที่ผูกธุรกิจอยู่ -> ย้ายไปโปร (ฟีเจอร์เท่ากัน ไม่ให้สิทธิ์หาย)
UPDATE "shops" SET "plan_id" = (SELECT "id" FROM "plans" WHERE "key" = 'pro')
  WHERE "plan_id" = (SELECT "id" FROM "plans" WHERE "key" = 'business');
DELETE FROM "plans" WHERE "key" = 'business';
