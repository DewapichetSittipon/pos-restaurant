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
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items!: OrderLineDto[];
}
