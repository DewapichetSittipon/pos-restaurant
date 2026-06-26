-- CreateTable: บันทึกการกระทำของพนักงาน
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "staff_id" INTEGER,
    "staff_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_shop_id_created_at_idx" ON "audit_logs"("shop_id", "created_at");
