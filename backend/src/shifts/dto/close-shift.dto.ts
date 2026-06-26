import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CloseShiftDto {
  // เงินสดที่นับได้จริงในลิ้นชักตอนปิดกะ (สตางค์)
  @IsInt()
  @Min(0)
  closingCashCounted!: number;

  // หมายเหตุ เช่น อธิบายส่วนต่าง (ถ้ามี)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
