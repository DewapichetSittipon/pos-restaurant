# การพิมพ์ใบเสร็จ (Thermal Printing)

มี 2 ช่องทาง เลือกได้ที่ **จัดการร้าน → แท็บ "พิมพ์"** (ตั้งค่าต่ออุปกรณ์ เก็บใน localStorage):

## 1. ผ่านเบราว์เซอร์ — `window.print()` (ค่าเริ่มต้น)
`web/src/utils/printReceipt.ts` → `printReceiptBrowser()` จัดหน้า 80mm
- ✅ ใช้ได้กับเครื่องพิมพ์ทุกชนิดที่ติดตั้งเป็น printer ของ OS (รวม thermal ที่มีไดรเวอร์)
- ✅ เลขที่ใบเสร็จรันต่อเนื่อง + สลับหัวเป็น "ใบกำกับภาษีอย่างย่อ" อัตโนมัติเมื่อใส่เลขผู้เสียภาษี
- ⚠️ บน iPad/มือถือ ต้องผ่าน dialog ปริ้นต์ของ OS (เลือกเครื่องเอง)

## 2. พิมพ์ตรงเข้าเครื่อง thermal — ESC/POS ผ่าน WebUSB ✅ (ทำแล้ว)
พิมพ์ทันทีไม่ผ่าน dialog โดยส่ง **ภาพ raster** เข้าเครื่องพิมพ์โดยตรง

**ทำไมส่งเป็นภาพ ไม่ใช่ text codepage:** ภาษาไทยบน ESC/POS ขึ้นกับ codepage ของเครื่องแต่ละรุ่น (TIS-620/Windows-874 ฯลฯ) ทำให้เพี้ยนง่าย — เราเรนเดอร์ใบเสร็จเป็น canvas ฝั่งเบราว์เซอร์เอง แล้วส่งเป็น raster bitmap (`GS v 0`) จึงได้ภาษาไทยถูกต้องทุกเครื่อง

**ไฟล์ที่เกี่ยวข้อง:**
- `web/src/utils/escpos.ts` — pack canvas เป็น 1bpp + คำสั่ง ESC/POS (init/raster/feed-cut) + transport ผ่าน `navigator.usb` (claim interface class 7, `transferOut`)
- `web/src/utils/receiptCanvas.ts` — วาด `CheckoutResult` ลง canvas 576 dots (80mm) / 384 (58mm) — layout mirror กับ `printReceipt.ts`
- `web/src/utils/printSettings.ts` — โหมด (browser/thermal) + ความกว้างกระดาษ
- `web/src/utils/printReceipt.ts` — `printReceipt()` เป็น dispatcher: thermal เมื่อเลือก+เบราว์เซอร์รองรับ ไม่งั้น fallback เป็น `window.print()` อัตโนมัติ
- `web/src/components/manage/ManagePrinter.tsx` — UI เลือกโหมด/เชื่อมต่อ USB/ทดสอบพิมพ์

**วิธีตั้งค่าหน้างาน:**
1. เปิดด้วย Chrome/Edge บนคอม (หรือ Android) — iOS/Safari ไม่รองรับ WebUSB
2. ไป จัดการร้าน → พิมพ์ → เลือก "เครื่อง thermal โดยตรง" → เลือกความกว้าง (80/58mm)
3. กด "เชื่อมต่อเครื่องพิมพ์ USB" → เลือกเครื่องใน dialog → กด "ทดสอบพิมพ์"

**ข้อจำกัด/ที่ต้องรู้:**
- รองรับเฉพาะเบราว์เซอร์ที่มี WebUSB (Chrome/Edge desktop + Android) — ไม่รองรับ iOS
- **Windows:** เครื่องพิมพ์ต้องผูก driver เป็น WinUSB (เช่นใช้ Zadig) ถ้าระบบจับเป็น printer ปกติอยู่ WebUSB จะ claim ไม่ได้
- **macOS/Linux:** ส่วนใหญ่ใช้ได้เลย แต่ถ้า OS ผูก usblp ไว้อาจต้องปลด
- ต้องเสียบ USB และเป็นเครื่องที่มี USB printer class (endpoint OUT) — เครื่องที่ต่อผ่าน serial/parallel adapter อาจไม่ตรงสเปก
- ⚠️ **ยังไม่ได้ทดสอบกับฮาร์ดแวร์จริงในรอบพัฒนานี้** — โค้ด build/typecheck ผ่าน แต่ควรทดสอบกับเครื่องพิมพ์จริงด้วยปุ่ม "ทดสอบพิมพ์" ก่อนใช้งานจริง ปรับ `bandRows`/`FEED_AND_CUT`/dots ได้ตามรุ่นเครื่อง

## ทางเลือกอื่น (ยังไม่ทำ — ถ้าต้องรองรับ iOS หรือทุกเบราว์เซอร์)
- **Local print agent**: โปรแกรมเล็กที่เครื่องแคชเชียร์ รับ POST แล้วส่ง ESC/POS — เสถียรสุด รองรับทุกเบราว์เซอร์ แต่ต้องติดตั้งต่อเครื่อง
- **Cloud print** (เช่น Star CloudPRNT): เครื่องพิมพ์ดึงงานจาก endpoint เราเอง — ไม่ต้องลงอะไรหน้าร้าน แต่ต้องใช้เครื่องรุ่นที่รองรับ
- **Web Bluetooth**: คล้าย WebUSB แต่ผ่าน BT — เหมาะเครื่องพิมพ์พกพา
