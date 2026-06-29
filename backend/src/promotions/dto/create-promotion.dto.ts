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

// สร้างโปรโมชัน — เงินเป็นสตางค์, % เป็น basis points, เวลาเป็นนาทีจากเที่ยงคืน
export class CreatePromotionDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsEnum(['percent', 'amount', 'bogo'])
  type!: 'percent' | 'amount' | 'bogo';

  // percent → basis points (1000 = 10%); amount → สตางค์; bogo → ไม่ใช้
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
