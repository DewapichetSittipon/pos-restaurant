import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  MaxLength,
  Min,
  IsString,
} from 'class-validator';

// แก้ไขโปรโมชัน — ทุกฟิลด์ optional (ส่งเฉพาะที่ต้องการแก้)
export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsEnum(['percent', 'amount', 'bogo'])
  type?: 'percent' | 'amount' | 'bogo';

  @IsOptional()
  @IsInt()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSubtotal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  endMinute?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(127)
  daysOfWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  buyQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  getQty?: number;

  @IsOptional()
  @IsBoolean()
  membersOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  birthdayOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;
}
