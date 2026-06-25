# หักสต็อกตอนสั่ง ไม่ใช่ตอนเช็คบิล

แผนเดิมให้ตรวจสอบสต็อกตอน `POST /api/orders` แต่หักสต็อกจริงตอน `POST /api/tables/:id/checkout`
ปัญหา: ช่วงระหว่างสั่งกับเช็คบิลกินเวลาเป็นชั่วโมง สต็อกไม่ถูกจอง ทำให้สองโต๊ะที่สั่งของชิ้นสุดท้ายพร้อมกัน
ผ่านการเช็คทั้งคู่แล้วขายเกิน (oversell)

**ตัดสินใจ:** หักสต็อกทันทีตอนสร้าง OrderItem ใน `POST /api/orders` ด้วย conditional update แบบ atomic
(`UPDATE menu SET stock_count = stock_count - :qty WHERE id = :id AND stock_count >= :qty`) ภายใน DB transaction
เดียวกับการสร้าง OrderItem ถ้ากระทบ 0 แถว แปลว่าของหมด ปฏิเสธทั้งออเดอร์ ขั้นตอน checkout จะไม่ยุ่งกับสต็อกอีก

**ผลที่ตามมา:** การยกเลิก/ปฏิเสธ OrderItem ต้องคืนสต็อกกลับ (ดู [[0002-void-restores-stock]]) — เป็น dependency
ที่ต้องออกแบบคู่กัน
