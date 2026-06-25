import type { MenuItem, OrderItem } from '../type/domain';

// เมนูสั่งได้เมื่อ available และ (ไม่นับสต็อก หรือ สต็อก > 0)
export function isOrderable(menu: MenuItem): boolean {
  return menu.isAvailable && (menu.stockCount === null || menu.stockCount > 0);
}

// จัดกลุ่ม OrderItem ตาม batchId เรียงตามเวลา -> "รอบที่ 1/2..."
export function groupByBatch(items: OrderItem[]): OrderItem[][] {
  const order: string[] = [];
  const map = new Map<string, OrderItem[]>();
  for (const item of items) {
    if (!map.has(item.batchId)) {
      map.set(item.batchId, []);
      order.push(item.batchId);
    }
    map.get(item.batchId)!.push(item);
  }
  return order.map((id) => map.get(id)!);
}
