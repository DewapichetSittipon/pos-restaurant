import { IsInt, Min } from 'class-validator';

export class OpenShiftDto {
  // เงินทอนตั้งต้นในลิ้นชัก (สตางค์)
  @IsInt()
  @Min(0)
  openingCash!: number;
}
