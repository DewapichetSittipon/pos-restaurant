# POS Restaurant + QR Self-Ordering

ระบบ POS ร้านอาหารที่ให้พนักงานเปิดโต๊ะและสร้าง QR ให้ลูกค้าสแกนสั่งอาหารเองจากมือถือ พร้อมแจ้งเตือนครัว/หน้าร้านแบบ real-time

## Language

**Bill**:
รอบบิลของลูกค้าหนึ่งกลุ่ม ตั้งแต่พนักงานเปิดโต๊ะจนถึงเช็คบิล หนึ่งโต๊ะมีได้ทีละหนึ่ง Bill ที่ยัง pending อยู่
_Avoid_: Transaction, Order (ในความหมายรอบบิล)

**OrderItem**:
อาหารหนึ่งรายการที่ลูกค้าสั่งภายใน Bill มีสถานะการทำอาหารของตัวเอง: queued → cooking → served
และมีสถานะ voided เมื่อถูกพนักงานยกเลิก ใช้คำว่า "queued" (ไม่ใช่ pending) เพื่อเลี่ยงชนกับ Bill.pending
เก็บ snapshot ทั้ง unit_price และ item_name จาก Menu ณ ตอนสั่ง เพื่อให้บิลย้อนหลังถูกต้องแม้ Menu เปลี่ยน
_Avoid_: Dish, LineItem; และเลี่ยงคำว่า pending สำหรับสถานะอาหาร

**Order Batch (batch_id)**:
กลุ่มของ OrderItem ที่ลูกค้ากดส่งพร้อมกันหนึ่งครั้ง ไม่ใช่ตารางแยก แต่เป็น UUID ที่แชร์กันใน OrderItem กลุ่มเดียวกัน ใช้แสดง "รอบที่ 1/2..." ให้ลูกค้า และจัดกลุ่ม ticket ให้ครัว
_Avoid_: Order, Round (ในโค้ด)

**Table**:
โต๊ะจริงในร้าน มีสถานะว่าง/ไม่ว่าง หนึ่งโต๊ะผูกกับ Bill ที่เปิดอยู่ได้ทีละหนึ่ง

**Menu**:
รายการอาหารที่ขายได้ มีราคาและสต็อกคงเหลือ ไม่ถูก hard-delete (ใช้ soft delete ผ่าน is_archived)
เพื่อรักษา FK ของ OrderItem ในบิลย้อนหลัง
_Avoid_: Product, Item

**is_available**:
สวิตช์ manual ของพนักงานสำหรับเปิด/ปิดการขายเมนู (หยุดขายชั่วคราว/วัตถุดิบหมด) เป็นอิสระจาก stock_count
ลูกค้าซื้อได้เมื่อ is_available = true และ (stock_count > 0 หรือ stock_count เป็น null = ไม่นับสต็อก)
สต็อกที่หมด (= 0) ไม่ไปแก้ is_available แค่แสดงว่า "หมด"

**Category**:
หมวดหมู่ของ Menu (เครื่องดื่ม, จานหลัก ฯลฯ)

**Staff**:
พนักงานหลังบ้านที่ต้องล็อกอินก่อนเข้าใช้ระบบ มี role สองแบบ: admin (จัดการโต๊ะ/เมนู/เช็คบิล/ดูยอดขาย)
และ kitchen (ดูออเดอร์และเปลี่ยนสถานะอาหาร) ลูกค้า (ฝั่ง QR) ไม่ใช่ Staff และไม่มีบัญชี
_Avoid_: User, Employee, Admin (ในความหมาย entity)

**ServiceRequest**:
คำขอจากโต๊ะที่ต้องการพนักงาน มีสองชนิด: call_staff (เรียกพนักงาน) กับ call_bill (เรียกเช็คบิล)
สถานะ pending → acknowledged เก็บลง DB ผูกกับ Bill และยิง socket event แจ้ง dashboard ทันที
_Avoid_: Notification, Alert (ในความหมาย entity)

**Void**:
การที่พนักงานยกเลิก OrderItem ขณะยังเป็น pending (ยังไม่ลงมือทำ) ซึ่งจะคืน stock_count กลับให้ Menu
เมื่อ OrderItem เป็น cooking แล้วจะ void ไม่ได้ ลูกค้าเองยกเลิกไม่ได้
_Avoid_: Cancel, Delete
