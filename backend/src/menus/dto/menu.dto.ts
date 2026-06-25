import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMenuDto {
  @IsInt()
  categoryId!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsInt()
  @Min(0)
  price!: number; // สตางค์

  // null/ไม่ส่ง = ไม่นับสต็อก
  @IsOptional()
  @IsInt()
  @Min(0)
  stockCount?: number | null;
}

export class UpdateMenuDto {
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number; // สตางค์

  @IsOptional()
  @IsInt()
  @Min(0)
  stockCount?: number | null; // null = เลิกนับสต็อก

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
