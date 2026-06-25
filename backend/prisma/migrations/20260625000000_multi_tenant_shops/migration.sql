-- DropIndex
DROP INDEX "tables_table_number_key";

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "shop_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "shop_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "menus" ADD COLUMN     "shop_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "staff" DROP COLUMN "role",
ADD COLUMN     "shop_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "shop_id" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "StaffRole";

-- CreateTable
CREATE TABLE "shops" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shops_slug_key" ON "shops"("slug");

-- CreateIndex
CREATE INDEX "bills_shop_id_idx" ON "bills"("shop_id");

-- CreateIndex
CREATE INDEX "categories_shop_id_idx" ON "categories"("shop_id");

-- CreateIndex
CREATE INDEX "menus_shop_id_idx" ON "menus"("shop_id");

-- CreateIndex
CREATE INDEX "staff_shop_id_idx" ON "staff"("shop_id");

-- CreateIndex
CREATE INDEX "tables_shop_id_idx" ON "tables"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "tables_shop_id_table_number_key" ON "tables"("shop_id", "table_number");

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

