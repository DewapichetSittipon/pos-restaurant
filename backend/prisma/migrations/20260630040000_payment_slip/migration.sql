-- สลิปโอนเงินที่ร้านอัปโหลดตอน onboarding/อัปเกรด (ให้ admin ตรวจก่อนอนุมัติ)
ALTER TABLE "shops" ADD COLUMN "payment_slip_url" TEXT;
