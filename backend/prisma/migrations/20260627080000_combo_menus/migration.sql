-- AlterTable: ธงระบุว่าเมนูเป็นชุด/คอมโบ
ALTER TABLE "menus" ADD COLUMN "is_combo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: นิยามส่วนประกอบของ combo (static set)
CREATE TABLE "combo_components" (
    "id" SERIAL NOT NULL,
    "combo_menu_id" INTEGER NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "combo_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable: snapshot ส่วนประกอบ combo ตอนสั่ง
CREATE TABLE "order_item_combo_components" (
    "id" SERIAL NOT NULL,
    "order_item_id" INTEGER NOT NULL,
    "menu_id" INTEGER,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "order_item_combo_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "combo_components_combo_menu_id_idx" ON "combo_components"("combo_menu_id");
CREATE INDEX "combo_components_menu_id_idx" ON "combo_components"("menu_id");
CREATE INDEX "order_item_combo_components_order_item_id_idx" ON "order_item_combo_components"("order_item_id");

-- AddForeignKey
ALTER TABLE "combo_components" ADD CONSTRAINT "combo_components_combo_menu_id_fkey" FOREIGN KEY ("combo_menu_id") REFERENCES "menus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "combo_components" ADD CONSTRAINT "combo_components_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_item_combo_components" ADD CONSTRAINT "order_item_combo_components_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
