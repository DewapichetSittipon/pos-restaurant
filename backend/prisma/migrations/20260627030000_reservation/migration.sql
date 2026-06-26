-- CreateEnum: สถานะการจองโต๊ะ
CREATE TYPE "ReservationStatus" AS ENUM ('booked', 'seated', 'cancelled');

-- CreateTable: การจองโต๊ะ
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "customer_name" TEXT NOT NULL,
    "phone" TEXT,
    "party_size" INTEGER NOT NULL,
    "reserved_at" TIMESTAMP(3) NOT NULL,
    "table_id" INTEGER,
    "note" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'booked',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reservations_shop_id_reserved_at_idx" ON "reservations"("shop_id", "reserved_at");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
