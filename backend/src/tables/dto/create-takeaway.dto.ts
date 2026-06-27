import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTakeawayDto {
  @IsEnum(['takeaway', 'delivery'] as const)
  orderType!: 'takeaway' | 'delivery';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  deliveryAddress?: string;

  // ค่าส่ง (สตางค์) — ใช้เฉพาะ delivery
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFee?: number;
}
