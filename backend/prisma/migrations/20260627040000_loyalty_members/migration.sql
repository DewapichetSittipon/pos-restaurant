-- AlterTable: อัตราแต้มสะสมต่อร้าน (0 = ปิดระบบสมาชิก)
ALTER TABLE "shops" ADD COLUMN "loyalty_earn_rate" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: ผูกบิลกับสมาชิก + snapshot แต้ม
ALTER TABLE "bills" ADD COLUMN "member_id" INTEGER;
ALTER TABLE "bills" ADD COLUMN "points_earned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bills" ADD COLUMN "points_redeemed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: สมาชิกร้าน
CREATE TABLE "members" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "members_shop_id_idx" ON "members"("shop_id");
CREATE UNIQUE INDEX "members_shop_id_phone_key" ON "members"("shop_id", "phone");
CREATE INDEX "bills_member_id_idx" ON "bills"("member_id");

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
