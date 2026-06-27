// ESC/POS direct printing ผ่าน WebUSB — ส่งใบเสร็จเป็น "ภาพ raster" (ไม่ใช่ text codepage)
// เพื่อเลี่ยงปัญหา codepage ภาษาไทยที่ต่างกันในแต่ละรุ่นเครื่องพิมพ์ (เราเรนเดอร์เป็นภาพเอง)
// รองรับเฉพาะเบราว์เซอร์ที่มี WebUSB (Chrome/Edge บน desktop/Android) — ไม่รองรับ iOS/Safari

// ---- WebUSB type guards (เลี่ยง dependency บน @types/w3c-web-usb) ----
interface UsbLike {
  requestDevice(opts: { filters: { classCode: number }[] }): Promise<UsbDevice>;
  getDevices(): Promise<UsbDevice[]>;
}
interface UsbDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(n: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  releaseInterface(n: number): Promise<void>;
  transferOut(
    endpoint: number,
    data: ArrayBufferView<ArrayBufferLike> | ArrayBuffer,
  ): Promise<{ status: string }>;
  configuration: UsbConfiguration | null;
  configurations: UsbConfiguration[];
}
interface UsbConfiguration {
  configurationValue: number;
  interfaces: {
    interfaceNumber: number;
    alternate: {
      interfaceClass: number;
      endpoints: { direction: 'in' | 'out'; endpointNumber: number }[];
    };
  }[];
}

const USB_PRINTER_CLASS = 7; // bInterfaceClass = Printer

function getUsb(): UsbLike | null {
  const usb = (navigator as unknown as { usb?: UsbLike }).usb;
  return usb ?? null;
}

export function isWebUsbSupported(): boolean {
  return getUsb() !== null;
}

// ---- ESC/POS command bytes ----
const ESC = 0x1b;
const GS = 0x1d;

const INIT = Uint8Array.from([ESC, 0x40]); // ESC @  (reset)
const FEED_AND_CUT = Uint8Array.from([
  ESC, 0x64, 0x03, // ESC d 3 — เลื่อนกระดาษ 3 บรรทัด
  GS, 0x56, 0x42, 0x00, // GS V 66 0 — ตัดกระดาษบางส่วน (partial cut)
]);

function concat(chunks: Uint8Array[]): Uint8Array {
  const len = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

// แปลง ImageData (ขาว-ดำ) เป็นบิตแมป 1bpp: 1 = จุดดำ, MSB ก่อน, แพ็ครายแถว
// threshold ที่ luminance < 128 = ดำ (เราวาดดำบนพื้นขาวอยู่แล้ว)
function packMonochrome(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { bytesPerRow: number; bitmap: Uint8Array } {
  const bytesPerRow = Math.ceil(width / 8);
  const bitmap = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // luminance + ผสม alpha (พื้นที่โปร่งใส = ขาว)
      const a = data[i + 3] / 255;
      const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) * a + 255 * (1 - a);
      if (lum < 128) {
        bitmap[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return { bytesPerRow, bitmap };
}

// สร้างคำสั่ง raster (GS v 0) — แบ่งเป็นแถบ (band) เลี่ยง buffer เครื่องพิมพ์ล้น
function rasterCommands(
  bytesPerRow: number,
  height: number,
  bitmap: Uint8Array,
  bandRows = 128,
): Uint8Array {
  const chunks: Uint8Array[] = [];
  for (let y = 0; y < height; y += bandRows) {
    const rows = Math.min(bandRows, height - y);
    const header = Uint8Array.from([
      GS, 0x76, 0x30, 0x00, // GS v 0 m=0
      bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff, // xL xH (จำนวนไบต์ต่อแถว)
      rows & 0xff, (rows >> 8) & 0xff, // yL yH (จำนวนแถวในแถบนี้)
    ]);
    const body = bitmap.subarray(y * bytesPerRow, (y + rows) * bytesPerRow);
    chunks.push(header, body);
  }
  return concat(chunks);
}

// สร้าง payload ESC/POS ทั้งใบจาก canvas ขาว-ดำ (init + raster + feed/cut)
export function buildReceiptPayload(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas context ไม่พร้อม');
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const { bytesPerRow, bitmap } = packMonochrome(data, width, height);
  return concat([INIT, rasterCommands(bytesPerRow, height, bitmap), FEED_AND_CUT]);
}

// เลือกอินเทอร์เฟซ/endpoint ของเครื่องพิมพ์ (class 7) แล้วคืน config ที่ใช้ส่ง
function resolvePrinterEndpoint(device: UsbDevice): {
  configValue: number;
  interfaceNumber: number;
  endpoint: number;
} {
  const config = device.configuration ?? device.configurations[0];
  if (!config) throw new Error('ไม่พบ configuration ของเครื่องพิมพ์');
  for (const iface of config.interfaces) {
    const alt = iface.alternate;
    if (alt.interfaceClass !== USB_PRINTER_CLASS) continue;
    const out = alt.endpoints.find((e) => e.direction === 'out');
    if (out) {
      return {
        configValue: config.configurationValue,
        interfaceNumber: iface.interfaceNumber,
        endpoint: out.endpointNumber,
      };
    }
  }
  throw new Error('เครื่องพิมพ์นี้ไม่มี endpoint สำหรับพิมพ์ (USB printer class)');
}

// ขอสิทธิ์เข้าถึงเครื่องพิมพ์ USB (เปิด dialog ให้ผู้ใช้เลือกครั้งแรก)
export async function requestUsbPrinter(): Promise<string> {
  const usb = getUsb();
  if (!usb) throw new Error('เบราว์เซอร์นี้ไม่รองรับ WebUSB');
  const device = await usb.requestDevice({
    filters: [{ classCode: USB_PRINTER_CLASS }],
  });
  return describeDevice(device);
}

function describeDevice(device: UsbDevice): string {
  // ไม่มี product string เสมอ — คืนค่าที่อ่านได้พอประมาณ
  const d = device as unknown as { productName?: string; manufacturerName?: string };
  return d.productName || d.manufacturerName || 'เครื่องพิมพ์ USB';
}

// หาเครื่องพิมพ์ที่เคยอนุญาตไว้แล้ว (ไม่ต้องเปิด dialog ซ้ำ)
async function getGrantedPrinter(): Promise<UsbDevice | null> {
  const usb = getUsb();
  if (!usb) return null;
  const devices = await usb.getDevices();
  for (const d of devices) {
    const config = d.configuration ?? d.configurations[0];
    if (
      config?.interfaces.some(
        (i) => i.alternate.interfaceClass === USB_PRINTER_CLASS,
      )
    ) {
      return d;
    }
  }
  return null;
}

export async function hasGrantedPrinter(): Promise<boolean> {
  return (await getGrantedPrinter()) !== null;
}

// ส่ง payload ESC/POS เข้าเครื่องพิมพ์ที่อนุญาตไว้ (เปิด/claim/transfer/ปล่อย)
export async function sendToPrinter(payload: Uint8Array): Promise<void> {
  const device = await getGrantedPrinter();
  if (!device) {
    throw new Error('ยังไม่ได้เชื่อมต่อเครื่องพิมพ์ — กดเชื่อมต่อในหน้า “พิมพ์” ก่อน');
  }
  await device.open();
  try {
    const ep = resolvePrinterEndpoint(device);
    if (device.configuration?.configurationValue !== ep.configValue) {
      await device.selectConfiguration(ep.configValue);
    }
    await device.claimInterface(ep.interfaceNumber);
    try {
      // ส่งเป็นก้อนเล็ก (บางไดรเวอร์จำกัดขนาด transfer)
      const CHUNK = 16 * 1024;
      for (let off = 0; off < payload.length; off += CHUNK) {
        await device.transferOut(ep.endpoint, payload.subarray(off, off + CHUNK));
      }
    } finally {
      await device.releaseInterface(ep.interfaceNumber).catch(() => undefined);
    }
  } finally {
    await device.close().catch(() => undefined);
  }
}
