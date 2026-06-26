-- CreateEnum: บทบาทพนักงานภายในร้าน
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'WAITER', 'KITCHEN');

-- AlterTable: staff เดิมทั้งหมดเป็น OWNER (ไม่มีใครหลุดสิทธิ์)
ALTER TABLE "staff" ADD COLUMN "role" "StaffRole" NOT NULL DEFAULT 'OWNER';
