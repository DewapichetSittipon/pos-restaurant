# Socket.io เป็น push อย่างเดียว, action ผ่าน REST

ระบบมีทั้ง REST API และ Socket.io ต้องตัดสินว่า client ทำ action (สั่งอาหาร/เปลี่ยนสถานะ/เรียกพนักงาน)
ผ่านช่องทางไหน

**ตัดสินใจ:** ทุก mutation ทำผ่าน REST endpoint เท่านั้น Socket.io ใช้ push event จาก server ไป client
อย่างเดียว (server → client) ไม่รับ action ขาเข้า

**Rooms:**
- `table:{billId}` — มือถือลูกค้าที่โต๊ะนั้น join (รับสถานะอาหาร + เหตุการณ์ปิดบิล) ใช้ billId ไม่ใช่ tableId
  เพื่อให้ event ผูกกับรอบบิลปัจจุบัน ไม่รั่วข้ามรอบ
- `kitchen` — จอครัวทุกจอ
- `admin` — จอหลังบ้านทุกจอ

**Events (server → client):** `order.created`, `orderItem.statusChanged`, `serviceRequest.created`,
`serviceRequest.acknowledged`, `table.opened`, `bill.closed`

**เหตุผล:** logic การ validate/auth/หักสต็อก อยู่ที่เดียว (REST + Prisma transaction) ไม่ต้องทำซ้ำใน socket handler
ลดความซับซ้อนและช่องโหว่ socket connection ยัง verify JWT (ฝั่ง staff) หรือ qr_token (ฝั่งลูกค้า) ตอน handshake
