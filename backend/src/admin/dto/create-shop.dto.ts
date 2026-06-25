import { IsString, Matches, MinLength } from 'class-validator';

export class CreateShopDto {
  @IsString()
  @MinLength(1)
  shopName!: string;

  // slug ใช้ทำ URL ภายหลัง — อังกฤษพิมพ์เล็ก/ตัวเลข/ขีดกลาง
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug ต้องเป็น a-z, 0-9, หรือ - เท่านั้น',
  })
  slug!: string;

  // login แรกของร้าน
  @IsString()
  @MinLength(3)
  staffUsername!: string;

  @IsString()
  @MinLength(6)
  staffPassword!: string;
}
