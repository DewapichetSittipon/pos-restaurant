import { create } from 'zustand';
import type { TranslatedName } from '../type/domain';

// ภาษาที่ฝั่งลูกค้ารองรับ — ไทยเป็นค่าหลัก/ค่า fallback เสมอ
export type Lang = 'th' | 'en' | 'zh';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'th', label: 'ไทย' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
];

const STORAGE_KEY = 'pos.lang';

function initialLang(): Lang {
  const saved =
    typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  return saved === 'en' || saved === 'zh' || saved === 'th' ? saved : 'th';
}

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: initialLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // โหมด private/บล็อก storage — ใช้ค่าใน memory ต่อได้
    }
    set({ lang });
  },
}));

export function useLang(): Lang {
  return useLangStore((s) => s.lang);
}

// ชื่อ entity (เมนู/หมวด/ตัวเลือก) ตามภาษา — fallback กลับชื่อไทยเมื่อยังไม่ได้แปล
export function localizedName(
  item: TranslatedName & { name: string },
  lang: Lang,
): string {
  if (lang === 'en') return item.nameEn?.trim() || item.name;
  if (lang === 'zh') return item.nameZh?.trim() || item.name;
  return item.name;
}

// --- ข้อความ UI (chrome) ฝั่งลูกค้า ---
const STRINGS = {
  th: {
    welcome: 'ยินดีต้อนรับ',
    tableLabel: 'โต๊ะ',
    chooseMenuHint: 'เลือกเมนูแล้วกดสั่งได้เลย',
    ordersBtn: 'รายการ',
    foodStatus: 'สถานะอาหาร',
    statusQueued: 'รอคิว',
    statusCooking: 'กำลังทำ',
    statusServed: 'เสิร์ฟแล้ว',
    comboTag: 'ชุด',
    lowStock: 'เหลือ {n} ที่',
    addBtn: 'เพิ่ม',
    soldOut: 'หมด',
    soldOutParen: '(หมด)',
    viewCart: 'ดูตะกร้า',
    cartTitle: 'ตะกร้าของคุณ',
    close: 'ปิด',
    cartEmpty: 'ตะกร้าว่าง',
    notePlaceholder: 'หมายเหตุ เช่น ไม่เผ็ด / พิเศษ (ถ้ามี)',
    submitting: 'กำลังส่ง...',
    confirmOrder: 'ยืนยันสั่ง · {total}',
    required: 'ต้องเลือก',
    optional: 'ไม่บังคับ',
    maxN: 'ได้สูงสุด {n}',
    addToCart: 'เพิ่มลงตะกร้า · {total}',
    chooseFirst: 'เลือก {name} ก่อน',
    orderListTitle: 'รายการที่สั่ง',
    grandTotal: 'รวมทั้งหมด',
    needHelp: 'ต้องการความช่วยเหลือ?',
    callStaff: 'เรียกพนักงาน',
    callBill: 'เรียกเช็คบิล',
    noOrders: 'ยังไม่มีรายการที่สั่ง',
    roundN: 'รอบที่ {n}',
    orderedAt: 'สั่ง {time}',
    servedAtTime: 'เสิร์ฟ {time}',
    orderSent: 'ส่งออเดอร์เรียบร้อย ✓',
    orderFailed: 'ส่งออเดอร์ไม่สำเร็จ',
    calledBill: 'เรียกเช็คบิลแล้ว ✓',
    calledStaff: 'เรียกพนักงานแล้ว ✓',
    requestFailed: 'ส่งคำขอไม่สำเร็จ',
    loading: 'กำลังโหลด...',
    helpTitle: 'วิธีสั่งอาหาร',
    helpStep1: 'เลือกเมนูที่ต้องการ ใส่ตัวเลือก/หมายเหตุ แล้วกดเพิ่มลงตะกร้า',
    helpStep2: 'เปิดตะกร้า ตรวจรายการ แล้วกด "ยืนยันสั่ง" — ออเดอร์เข้าครัวทันที',
    helpStep3: 'ดูสถานะอาหารแบบสด (รอคิว/กำลังทำ/เสิร์ฟแล้ว) ที่ปุ่ม "รายการ"',
    helpStep4: 'ต้องการอะไรเพิ่ม กด "เรียกพนักงาน" หรือ "เรียกเช็คบิล" ได้เลย',
    invalidLinkTitle: 'ลิงก์ไม่ถูกต้อง',
    invalidLinkDetail: 'กรุณาสแกน QR ที่โต๊ะอีกครั้ง',
    invalidSessionTitle: 'เซสชันไม่ถูกต้อง',
    invalidSessionDetail: 'บิลนี้อาจถูกปิดแล้ว กรุณาเรียกพนักงาน',
    closedTitle: 'ปิดบิลเรียบร้อย',
    closedDetail: 'ขอบคุณที่ใช้บริการ',
  },
  en: {
    welcome: 'Welcome',
    tableLabel: 'Table',
    chooseMenuHint: 'Browse the menu and tap to order',
    ordersBtn: 'Orders',
    foodStatus: 'Order status',
    statusQueued: 'Queued',
    statusCooking: 'Cooking',
    statusServed: 'Served',
    comboTag: 'Set',
    lowStock: '{n} left',
    addBtn: 'Add',
    soldOut: 'Sold out',
    soldOutParen: '(sold out)',
    viewCart: 'View cart',
    cartTitle: 'Your cart',
    close: 'Close',
    cartEmpty: 'Your cart is empty',
    notePlaceholder: 'Note e.g. not spicy / extra (optional)',
    submitting: 'Sending...',
    confirmOrder: 'Place order · {total}',
    required: 'Required',
    optional: 'Optional',
    maxN: 'up to {n}',
    addToCart: 'Add to cart · {total}',
    chooseFirst: 'Select {name} first',
    orderListTitle: 'Your orders',
    grandTotal: 'Total',
    needHelp: 'Need help?',
    callStaff: 'Call staff',
    callBill: 'Request bill',
    noOrders: 'No orders yet',
    roundN: 'Round {n}',
    orderedAt: 'Ordered {time}',
    servedAtTime: 'Served {time}',
    orderSent: 'Order sent ✓',
    orderFailed: 'Failed to send order',
    calledBill: 'Bill requested ✓',
    calledStaff: 'Staff called ✓',
    requestFailed: 'Request failed',
    loading: 'Loading...',
    helpTitle: 'How to order',
    helpStep1: 'Pick a menu item, choose options/notes, then add it to your cart',
    helpStep2: 'Open the cart, review, then tap "Place order" — it goes straight to the kitchen',
    helpStep3: 'Track your food live (queued/cooking/served) via the "Orders" button',
    helpStep4: 'Need anything? Tap "Call staff" or "Request bill"',
    invalidLinkTitle: 'Invalid link',
    invalidLinkDetail: 'Please scan the QR code at your table again',
    invalidSessionTitle: 'Invalid session',
    invalidSessionDetail: 'This bill may be closed. Please call staff.',
    closedTitle: 'Bill closed',
    closedDetail: 'Thank you for visiting',
  },
  zh: {
    welcome: '欢迎光临',
    tableLabel: '桌号',
    chooseMenuHint: '浏览菜单，点击即可下单',
    ordersBtn: '订单',
    foodStatus: '出餐状态',
    statusQueued: '排队中',
    statusCooking: '制作中',
    statusServed: '已上菜',
    comboTag: '套餐',
    lowStock: '仅剩 {n} 份',
    addBtn: '添加',
    soldOut: '售罄',
    soldOutParen: '（售罄）',
    viewCart: '查看购物车',
    cartTitle: '您的购物车',
    close: '关闭',
    cartEmpty: '购物车是空的',
    notePlaceholder: '备注，如不辣 / 加量（可选）',
    submitting: '提交中...',
    confirmOrder: '确认下单 · {total}',
    required: '必选',
    optional: '可选',
    maxN: '最多 {n}',
    addToCart: '加入购物车 · {total}',
    chooseFirst: '请先选择 {name}',
    orderListTitle: '已点菜品',
    grandTotal: '合计',
    needHelp: '需要帮助？',
    callStaff: '呼叫服务员',
    callBill: '结账',
    noOrders: '还没有点菜',
    roundN: '第 {n} 轮',
    orderedAt: '下单 {time}',
    servedAtTime: '上菜 {time}',
    orderSent: '下单成功 ✓',
    orderFailed: '下单失败',
    calledBill: '已请求结账 ✓',
    calledStaff: '已呼叫服务员 ✓',
    requestFailed: '请求失败',
    loading: '加载中...',
    helpTitle: '点餐方法',
    helpStep1: '选择菜品，设置选项/备注，然后加入购物车',
    helpStep2: '打开购物车核对后点击"确认下单"，订单将直接送到厨房',
    helpStep3: '通过"订单"按钮实时查看出餐状态（排队中/制作中/已上菜）',
    helpStep4: '需要帮助？点击"呼叫服务员"或"结账"',
    invalidLinkTitle: '链接无效',
    invalidLinkDetail: '请重新扫描桌上的二维码',
    invalidSessionTitle: '会话无效',
    invalidSessionDetail: '此账单可能已关闭，请呼叫服务员',
    closedTitle: '账单已结清',
    closedDetail: '感谢您的光临',
  },
} as const;

export type StringKey = keyof (typeof STRINGS)['th'];

function format(tpl: string, params?: Record<string, string | number>): string {
  if (!params) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
}

export type TranslateFn = (
  key: StringKey,
  params?: Record<string, string | number>,
) => string;

// hook คืนฟังก์ชันแปลข้อความ UI ตามภาษาปัจจุบัน (fallback ไทย)
export function useT(): TranslateFn {
  const lang = useLang();
  return (key, params) => format(STRINGS[lang][key] ?? STRINGS.th[key], params);
}
