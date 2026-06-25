# Snapshot ราคาที่ OrderItem และ Bill

แผนเดิม OrderItem ไม่มีฟิลด์ราคา และ total_price อยู่ที่ Bill เฉยๆ ทำให้ถ้าราคา Menu เปลี่ยนระหว่างวัน
บิลย้อนหลังจะคำนวณผิด

**ตัดสินใจ:** เก็บราคาซ้ำเป็น snapshot สองชั้น —
- `OrderItem.unit_price` snapshot จาก `Menu.price` ณ ตอนสั่ง (immutable หลังสั่ง)
- `Bill.total_price` คำนวณสดจากผลรวม OrderItem ก่อนเช็คบิล แต่ snapshot ค่าสุดท้ายลงไปตอน `checkout`

**เหตุผล:** บิลที่จ่ายแล้วต้องเป็น record ที่ไม่เปลี่ยนตามราคาปัจจุบัน และ EOD report ต้องรวมยอดจากตัวเลขที่นิ่ง
แม้เจ้าของจะแก้ราคา Menu ภายหลัง ยอมแลกกับการเก็บราคาซ้ำ (denormalize) ซึ่งเป็นเรื่องปกติของระบบบิล
