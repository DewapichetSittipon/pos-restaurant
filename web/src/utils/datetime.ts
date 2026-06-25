// วันที่วันนี้ตามเขตเวลาไทย (YYYY-MM-DD) — ตรงกับฐานของ EOD report
export function bangkokToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
  }).format(new Date());
}

// เวลา HH:mm ตามเขตเวลาไทย
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
  });
}
