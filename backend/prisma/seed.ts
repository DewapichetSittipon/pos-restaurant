import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PLAN_FEATURES } from '../src/common/plan-access';

const prisma = new PrismaClient();

// ราคาเก็บเป็นสตางค์: บาท * 100
const baht = (b: number): number => b * 100;

// ฟีเจอร์ทั้งหมด (ยกเว้นหลายสาขา) = ชุดของแพ็กเกจโปร
const PRO_FEATURES: string[] = [
  PLAN_FEATURES.reportHistory,
  PLAN_FEATURES.promotions,
  PLAN_FEATURES.loyalty,
  PLAN_FEATURES.i18n,
  PLAN_FEATURES.reservations,
  PLAN_FEATURES.shifts,
  PLAN_FEATURES.escposPrint,
  PLAN_FEATURES.vat,
];

// สร้าง 3 แพ็กเกจ — ราคาเป็น placeholder ปรับได้ใน DB ภายหลัง คืน id ของ free/pro ไว้ผูกร้านตัวอย่าง
async function seedPlans(): Promise<{ freeId: number; proId: number }> {
  const free = await prisma.plan.create({
    data: {
      key: 'free',
      name: 'ฟรี',
      priceMonthly: 0,
      features: [],
      maxStaff: 3,
      maxTable: 10,
      maxMenu: 30,
      sortOrder: 0,
    },
  });
  const pro = await prisma.plan.create({
    data: {
      key: 'pro',
      name: 'โปร',
      priceMonthly: baht(390),
      features: PRO_FEATURES,
      maxStaff: null, // ไม่จำกัด
      maxTable: null,
      maxMenu: null,
      sortOrder: 1,
    },
  });
  await prisma.plan.create({
    data: {
      key: 'business',
      name: 'ธุรกิจ',
      priceMonthly: baht(990),
      features: [...PRO_FEATURES, PLAN_FEATURES.multiBranch],
      maxStaff: null,
      maxTable: null,
      maxMenu: null,
      sortOrder: 2,
    },
  });
  return { freeId: free.id, proId: pro.id };
}

// สร้างหนึ่งร้านพร้อมโต๊ะ/หมวด/เมนู/staff ของตัวเอง
async function seedShop(opts: {
  name: string;
  slug: string;
  username: string;
  password: string;
  tableCount: number;
  planId?: number;
  address?: string;
  phone?: string;
}): Promise<void> {
  const shop = await prisma.shop.create({
    data: {
      name: opts.name,
      slug: opts.slug,
      status: 'active', // ร้าน seed ใช้งานได้ทันที
      planId: opts.planId, // แพ็กเกจ subscription (undefined = ฟรีโดย default)
      subscriptionStatus: 'active',
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

  // --- ชุด/คอมโบ (ราคาคงที่) ตัวอย่าง: ข้าวผัดหมู + โค้ก ---
  const [khaoPad, coke] = await Promise.all([
    prisma.menu.findFirst({ where: { shopId: shop.id, name: 'ข้าวผัดหมู' } }),
    prisma.menu.findFirst({ where: { shopId: shop.id, name: 'โค้ก' } }),
  ]);
  if (khaoPad && coke) {
    await prisma.menu.create({
      data: {
        shopId: shop.id,
        categoryId: mains.id,
        name: 'ชุดข้าวผัดหมู + โค้ก',
        price: baht(75), // ถูกกว่าซื้อแยก (60 + 25 = 85)
        stockCount: null,
        isCombo: true,
        comboComponents: {
          create: [
            { menuId: khaoPad.id, quantity: 1, sortOrder: 0 },
            { menuId: coke.id, quantity: 1, sortOrder: 1 },
          ],
        },
      },
    });
  }

  // --- พนักงาน: คนแรกของร้าน = เจ้าของร้าน (OWNER) เห็นทุกหน้า ---
  await prisma.staff.create({
    data: {
      shopId: shop.id,
      username: opts.username,
      passwordHash: await bcrypt.hash(opts.password, 10),
      role: 'OWNER',
    },
  });
}

async function main(): Promise<void> {
  // ล้างข้อมูลเดิม (dev only) + รีเซ็ต autoincrement ให้ id เริ่มที่ 1 เสมอ
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "service_requests","order_items","bills","menus","categories","tables","staff","shops","plans","platform_admins" RESTART IDENTITY CASCADE;',
  );

  // แพ็กเกจ subscription (สร้างก่อนร้าน เพื่อผูก planId)
  const { freeId, proId } = await seedPlans();

  // ผู้ดูแลแพลตฟอร์ม (เจ้าของระบบ) — ใช้สร้าง/จัดการร้าน
  await prisma.platformAdmin.create({
    data: {
      username: 'superadmin',
      passwordHash: await bcrypt.hash('super123', 10),
    },
  });

  // สองร้านตัวอย่าง เพื่อพิสูจน์ data isolation
  // ร้าน A = แพ็กเกจโปร (โชว์ฟีเจอร์เต็ม), ร้าน B = ฟรี (โชว์เพดาน resource)
  await seedShop({
    name: 'ร้านอาหารตามสั่ง A',
    slug: 'shop-a',
    username: 'shopa',
    password: 'shopa123',
    tableCount: 10,
    planId: proId,
    address: '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
    phone: '02-123-4567',
  });
  await seedShop({
    name: 'ร้านก๋วยเตี๋ยว B',
    slug: 'shop-b',
    username: 'shopb',
    password: 'shopb123',
    tableCount: 6,
    planId: freeId,
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
