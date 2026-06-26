import generatePayload from 'promptpay-qr';

// สร้าง PromptPay payload (มาตรฐาน EMVCo) สำหรับ render เป็น QR
// id = เบอร์มือถือ/เลขบัตรประชาชน/เลขนิติบุคคล, satang = ยอดสุทธิ (สตางค์)
export function promptpayPayload(id: string, satang: number): string {
  return generatePayload(id, { amount: satang / 100 });
}
