import { IsInt } from 'class-validator';

export class MergeBillDto {
  // โต๊ะต้นทางที่จะถูกรวมเข้ากับโต๊ะปลายทาง (:id) — รายการทั้งหมดย้ายมาที่ปลายทาง
  @IsInt()
  fromTableId!: number;
}
