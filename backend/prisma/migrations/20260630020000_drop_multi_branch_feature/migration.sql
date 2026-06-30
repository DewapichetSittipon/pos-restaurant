-- เลิกใช้ฟีเจอร์ "หลายสาขา" (multi_branch) — ยังไม่มีโค้ดรองรับจริง
-- ธุรกิจเปลี่ยนจุดขายเป็นเชิงบริการแทน → ฟีเจอร์ซอฟต์แวร์เท่าโปร
UPDATE "plans" SET "features" = array_remove("features", 'multi_branch');
