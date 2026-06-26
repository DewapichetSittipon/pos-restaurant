import { IsEnum, IsString, MinLength } from 'class-validator';
import { StaffRole } from '@prisma/client';

export class CreateStaffDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(StaffRole)
  role!: StaffRole;
}

export class SetPasswordDto {
  @IsString()
  @MinLength(6)
  password!: string;
}
