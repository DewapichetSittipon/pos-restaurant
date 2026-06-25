// แปลงสตางค์ -> ข้อความบาท
export function formatBaht(satang: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(satang / 100);
}
