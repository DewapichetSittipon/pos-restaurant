import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VoidOrderDto {
  // เหตุผลที่ยกเลิก (ไม่บังคับ)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
