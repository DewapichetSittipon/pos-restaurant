-- CreateEnum
CREATE TYPE "ShopRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "shop_requests" (
    "id" SERIAL NOT NULL,
    "shop_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "note" TEXT,
    "status" "ShopRequestStatus" NOT NULL DEFAULT 'pending',
    "admin_note" TEXT,
    "created_shop_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "shop_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_requests_status_idx" ON "shop_requests"("status");
