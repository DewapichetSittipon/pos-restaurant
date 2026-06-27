import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
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

// --- Modifiers (ตัวเลือกเมนู) ---

export class ModifierOptionInput {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsInt()
  @Min(0)
  priceDelta!: number; // สตางค์ (0 = ไม่บวกเพิ่ม)

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class ModifierGroupInput {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsInt()
  @Min(0)
  minSelect!: number; // 0 = ไม่บังคับ

  @IsInt()
  @Min(1)
  maxSelect!: number; // เลือกได้สูงสุดกี่ตัว

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ModifierOptionInput)
  options!: ModifierOptionInput[];
}

export class SetMenuModifiersDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ModifierGroupInput)
  groups!: ModifierGroupInput[];
}

// --- Combo / Set menu (static set, ราคาคงที่) ---

export class ComboComponentInput {
  @IsInt()
  menuId!: number; // เมนูจริงที่เป็นส่วนประกอบ (ห้ามเป็น combo เอง — เช็คใน service)

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateComboDto {
  @IsInt()
  categoryId!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsInt()
  @Min(0)
  price!: number; // สตางค์ — ราคาคงที่ของทั้งเซต

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ComboComponentInput)
  components!: ComboComponentInput[];
}

export class SetComboComponentsDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ComboComponentInput)
  components!: ComboComponentInput[];
}
