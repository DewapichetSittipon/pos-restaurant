import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { OrderLineDto } from './create-order.dto';

// พนักงานคีย์ออเดอร์ให้โต๊ะ — ระบุ tableId (resolve บิลที่เปิดอยู่ฝั่ง service)
export class StaffOrderDto {
  @IsInt()
  tableId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items!: OrderLineDto[];
}
