# เลือก NestJS เป็น backend framework

แผนเปิดทางเลือกระหว่าง Express กับ NestJS

**ตัดสินใจ:** ใช้ NestJS

**เหตุผล:** เข้ากับการตัดสินใจอื่นที่ทำไว้แล้ว — Guards รองรับ JWT + role ([[adr ที่เกี่ยวกับ auth]]),
`@WebSocketGateway` ห่อ Socket.io มาให้, ValidationPipe/DTO กันข้อมูลขยะตอนรับออเดอร์, และโครงสร้าง module
ชัดเจนสำหรับระบบที่มีหลาย bounded operation (tables, orders, menu, billing, auth)
ยอมแลกกับ boilerplate ที่มากกว่า Express
