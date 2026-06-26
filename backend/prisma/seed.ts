import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ราคาเก็บเป็นสตางค์: บาท * 100
const baht = (b: number): number => b * 100;

// สร้างหนึ่งร้านพร้อมโต๊ะ/หมวด/เมนู/staff ของตัวเอง
async function seedShop(opts: {
  name: string;
  slug: string;
  username: string;
  password: string;
  tableCount: number;
  address?: string;
  phone?: string;
}): Promise<void> {
  const shop = await prisma.shop.create({
    data: {
      name: opts.name,
      slug: opts.slug,
      address: opts.address,
      phone: opts.phone,
    },
  });

  // --- โต๊ะ ---
  await prisma.table.createMany({
    data: Array.from({ length: opts.tableCount }, (_, i) => ({
      shopId: shop.id,
      tableNumber: String(i + 1),
    })),
  });

  // --- หมวดหมู่ + เมนู ---
  const drinks = await prisma.category.create({
    data: { shopId: shop.id, name: 'เครื่องดื่ม' },
  });
  const mains = await prisma.category.create({
    data: { shopId: shop.id, name: 'อาหารจานหลัก' },
  });
  const snacks = await prisma.category.create({
    data: { shopId: shop.id, name: 'ของทานเล่น' },
  });
  const desserts = await prisma.category.create({
    data: { shopId: shop.id, name: 'ของหวาน' },
  });

  await prisma.menu.createMany({
    data: [
      // เครื่องดื่ม — น้ำเปล่าไม่นับสต็อก (stockCount = null)
      { shopId: shop.id, categoryId: drinks.id, name: 'น้ำเปล่า', price: baht(15), stockCount: null },
      { shopId: shop.id, categoryId: drinks.id, name: 'โค้ก', price: baht(25), stockCount: 40 },
      { shopId: shop.id, categoryId: drinks.id, name: 'ชาเย็น', price: baht(35), stockCount: 30 },
      { shopId: shop.id, categoryId: drinks.id, name: 'เบียร์', price: baht(80), stockCount: 24 },

      // อาหารจานหลัก
      { shopId: shop.id, categoryId: mains.id, name: 'ผัดไทยกุ้งสด', price: baht(70), stockCount: 20 },
      { shopId: shop.id, categoryId: mains.id, name: 'ข้าวผัดหมู', price: baht(60), stockCount: 25 },
      { shopId: shop.id, categoryId: mains.id, name: 'ต้มยำกุ้ง', price: baht(120), stockCount: 15 },
      { shopId: shop.id, categoryId: mains.id, name: 'กะเพราหมูสับ', price: baht(60), stockCount: 30 },

      // ของทานเล่น
      { shopId: shop.id, categoryId: snacks.id, name: 'ปอเปี๊ยะทอด', price: baht(45), stockCount: 18 },
      { shopId: shop.id, categoryId: snacks.id, name: 'ไก่ทอด', price: baht(55), stockCount: 1 }, // เหลือน้อย ทดสอบของหมด
      { shopId: shop.id, categoryId: snacks.id, name: 'เฟรนช์ฟรายส์', price: baht(50), stockCount: 0, isAvailable: false },

      // ของหวาน
      { shopId: shop.id, categoryId: desserts.id, name: 'ข้าวเหนียวมะม่วง', price: baht(65), stockCount: 12 },
      { shopId: shop.id, categoryId: desserts.id, name: 'บัวลอย', price: baht(40), stockCount: 10 },
    ],
  });

  // --- พนักงาน (ไม่มี role แล้ว — staff คนไหนของร้านก็เข้าได้ทุกหน้า) ---
  await prisma.staff.create({
    data: {
      shopId: shop.id,
      username: opts.username,
      passwordHash: await bcrypt.hash(opts.password, 10),
    },
  });
}

async function main(): Promise<void> {
  // ล้างข้อมูลเดิม (dev only) + รีเซ็ต autoincrement ให้ id เริ่มที่ 1 เสมอ
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "service_requests","order_items","bills","menus","categories","tables","staff","shops","platform_admins" RESTART IDENTITY CASCADE;',
  );

  // ผู้ดูแลแพลตฟอร์ม (เจ้าของระบบ) — ใช้สร้าง/จัดการร้าน
  await prisma.platformAdmin.create({
    data: {
      username: 'superadmin',
      passwordHash: await bcrypt.hash('super123', 10),
    },
  });

  // สองร้านตัวอย่าง เพื่อพิสูจน์ data isolation
  await seedShop({
    name: 'ร้านอาหารตามสั่ง A',
    slug: 'shop-a',
    username: 'shopa',
    password: 'shopa123',
    tableCount: 10,
    address: '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
    phone: '02-123-4567',
  });
  await seedShop({
    name: 'ร้านก๋วยเตี๋ยว B',
    slug: 'shop-b',
    username: 'shopb',
    password: 'shopb123',
    tableCount: 6,
    address: '456 ถ.พหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900',
    phone: '02-987-6543',
  });

  const [admins, shops, tables, menus, staff] = await Promise.all([
    prisma.platformAdmin.count(),
    prisma.shop.count(),
    prisma.table.count(),
    prisma.menu.count(),
    prisma.staff.count(),
  ]);
  console.log('✅ seed เสร็จ:', { admins, shops, tables, menus, staff });
  console.log('   platform admin: superadmin/super123');
  console.log('   staff: shopa/shopa123 (ร้าน A), shopb/shopb123 (ร้าน B)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
