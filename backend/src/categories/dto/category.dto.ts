import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  nameEn?: string; // ชื่อแปลอังกฤษ (ว่าง = ใช้ name ไทย)

  @IsOptional()
  @IsString()
  @MaxLength(60)
  nameZh?: string; // ชื่อแปลจีน (ว่าง = ใช้ name ไทย)
}

export class UpdateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  nameZh?: string;
}
