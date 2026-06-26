import { IsIn } from 'class-validator';

export class UpdateReservationStatusDto {
  // เปลี่ยนเป็น seated (มาถึง) หรือ cancelled (ยกเลิก/ไม่มา)
  @IsIn(['seated', 'cancelled'])
  status!: 'seated' | 'cancelled';
}
