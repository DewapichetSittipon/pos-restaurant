import { useStaffStore } from '../store/staffStore';
import type { StaffRole } from '../type/staff';

// คู่มือย่อในแอป — แสดงเฉพาะหัวข้อที่บทบาทผู้ใช้ใช้งานได้จริง
// (ฉบับเต็มอยู่ที่ docs/user-manual.md)
interface Section {
  emoji: string;
  title: string;
  roles: StaffRole[]; // บทบาทที่เห็นหัวข้อนี้
  items: string[];
}

const SECTIONS: Section[] = [
  {
    emoji: '🍽️',
    title: 'ผังโต๊ะ / เช็คบิล',
    roles: ['OWNER', 'WAITER'],
    items: [
      'เปิดโต๊ะ → ระบบสร้าง QR Code ให้ลูกค้าสแกนสั่งอาหารเอง',
      'คีย์ออเดอร์ให้โต๊ะ และดูรายการที่ลูกค้าสั่ง',
      'รับเรื่อง "เรียกพนักงาน / เรียกบิล" จากลูกค้า',
      'เช็คบิล: ส่วนลด · เงินสด/โอน · เงินทอน · VAT · เซอร์วิส · แต้มสมาชิก · QR PromptPay',
      'ย้ายโต๊ะ · รวมบิล · แยกบิล (ลูกค้าจ่ายแยกได้)',
    ],
  },
  {
    emoji: '🍳',
    title: 'ครัว',
    roles: ['OWNER', 'KITCHEN'],
    items: [
      'ดูคิวออเดอร์ใหม่แบบ real-time (เด้งทันทีเมื่อมีออเดอร์)',
      'เปลี่ยนสถานะ: รอคิว → กำลังทำ → เสิร์ฟแล้ว',
      'ออเดอร์ที่ส่งพร้อมกันรวมเป็น ticket เดียว (รอบที่ 1/2..)',
      'ยกเลิก (void) พร้อมเหตุผล — คืนสต็อกอัตโนมัติถ้ายังไม่เริ่มทำ',
    ],
  },
  {
    emoji: '🥡',
    title: 'กลับบ้าน (Takeaway)',
    roles: ['OWNER', 'WAITER'],
    items: [
      'สร้างออเดอร์กลับบ้านโดยไม่ผูกโต๊ะ',
      'เช็คบิลเหมือนหน้าโต๊ะปกติ',
    ],
  },
  {
    emoji: '💵',
    title: 'กะ / เงินลิ้นชัก',
    roles: ['OWNER', 'WAITER'],
    items: [
      'เปิดกะ — ใส่เงินตั้งต้นในลิ้นชัก',
      'ปิดกะ — นับเงินจริง ระบบคำนวณเงินเกิน/ขาดให้',
      'ดูประวัติกะย้อนหลัง',
    ],
  },
  {
    emoji: '📅',
    title: 'จองโต๊ะ',
    roles: ['OWNER', 'WAITER'],
    items: [
      'เพิ่ม/ดูการจองรายวัน',
      'อัปเดตสถานะ: จองไว้ → มาแล้ว / ยกเลิก',
    ],
  },
  {
    emoji: '📊',
    title: 'รายงานยอดขาย',
    roles: ['OWNER'],
    items: [
      'สรุปยอดวัน (EOD) แยกเงินสด/โอน/VAT/เซอร์วิส',
      'เมนูขายดี · เวลาเตรียมอาหารเฉลี่ย · ยอดรายชั่วโมง · ยอดช่วงวันที่',
      'ดาวน์โหลด CSV · ดูบิลย้อนหลัง · พิมพ์ใบเสร็จซ้ำ · คืนเงิน (refund)',
    ],
  },
  {
    emoji: '⚙️',
    title: 'จัดการร้าน',
    roles: ['OWNER'],
    items: [
      'โต๊ะ · หมวดหมู่ · เมนู (รูป/ราคา/สต็อก/เปิด-ปิดขาย) · ชุด/คอมโบ',
      'ข้อมูลร้าน: หัวใบเสร็จ · PromptPay · VAT · เซอร์วิส · อัตราแต้ม',
      'พิมพ์ (ตั้งค่าเครื่องพิมพ์) · พนักงาน (เพิ่ม/ลบ/รีเซ็ตรหัส/role)',
      'สมาชิก · โปรโมชัน (happy hour/BOGO/สมาชิก/วันเกิด) · บันทึก (audit) · บัญชี',
    ],
  },
];

const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: 'เจ้าของร้าน',
  WAITER: 'พนักงานเสิร์ฟ',
  KITCHEN: 'ครัว',
};

export function HelpPage() {
  const staff = useStaffStore((s) => s.staff);
  const role = staff?.role;
  const sections = role
    ? SECTIONS.filter((s) => s.roles.includes(role))
    : SECTIONS;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold">คู่มือการใช้งาน</h1>
      <p className="mt-1 text-sm text-slate-500">
        หัวข้อด้านล่างคือสิ่งที่บทบาท
        {role ? ` "${ROLE_LABEL[role]}"` : 'ของคุณ'} ใช้งานได้
        ดูฉบับเต็มได้ที่ <code className="text-slate-600">docs/user-manual.md</code>
      </p>

      <div className="mt-5 space-y-4">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="mb-3 text-lg font-bold">
              {section.emoji} {section.title}
            </h2>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
