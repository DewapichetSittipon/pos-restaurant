// ตั้งค่าการพิมพ์ "ต่ออุปกรณ์" (เก็บใน localStorage ของเครื่องแคชเชียร์นั้น ๆ ไม่ผูกกับร้าน)
// browser = พิมพ์ผ่าน window.print() (ค่าเริ่มต้น, ใช้ได้ทุกเบราว์เซอร์)
// thermal = พิมพ์ตรงเข้าเครื่อง ESC/POS ผ่าน WebUSB (เฉพาะ Chrome/Edge desktop/Android)

export type PrintMode = 'browser' | 'thermal';

const MODE_KEY = 'pos.printMode';
const DOTS_KEY = 'pos.printerDots';

export function getPrintMode(): PrintMode {
  return localStorage.getItem(MODE_KEY) === 'thermal' ? 'thermal' : 'browser';
}

export function setPrintMode(mode: PrintMode): void {
  localStorage.setItem(MODE_KEY, mode);
}

// ความกว้างหัวพิมพ์เป็น dots: 80mm = 576 (ค่าเริ่มต้น), 58mm = 384
export function getPrinterDots(): number {
  const v = Number(localStorage.getItem(DOTS_KEY));
  return v === 384 ? 384 : 576;
}

export function setPrinterDots(dots: number): void {
  localStorage.setItem(DOTS_KEY, String(dots === 384 ? 384 : 576));
}
