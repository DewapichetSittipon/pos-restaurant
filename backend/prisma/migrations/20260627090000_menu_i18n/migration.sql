-- เพิ่มฟิลด์ชื่อแปล (อังกฤษ/จีน) สำหรับเมนูฝั่งลูกค้า — nullable, fallback ไปไทยเมื่อว่าง
ALTER TABLE "categories"
  ADD COLUMN "name_en" TEXT,
  ADD COLUMN "name_zh" TEXT;

ALTER TABLE "menus"
  ADD COLUMN "name_en" TEXT,
  ADD COLUMN "name_zh" TEXT;

ALTER TABLE "modifier_groups"
  ADD COLUMN "name_en" TEXT,
  ADD COLUMN "name_zh" TEXT;

ALTER TABLE "modifier_options"
  ADD COLUMN "name_en" TEXT,
  ADD COLUMN "name_zh" TEXT;
