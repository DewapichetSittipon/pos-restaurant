import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderLineDto {
  @IsInt()
  menuId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;

  // หมายเหตุ/คำขอพิเศษต่อรายการ (เช่น "ไม่เผ็ด")
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  // id ของ ModifierOption ที่เลือก (เช่น ขนาด/ระดับ/ท็อปปิ้ง) — validate ฝั่ง service
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  modifierOptionIds?: number[];
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items!: OrderLineDto[];
}
