import { IsIn } from 'class-validator';

// ครัวเปลี่ยนสถานะไปข้างหน้าเท่านั้น (queued -> cooking -> served)
export class UpdateStatusDto {
  @IsIn(['cooking', 'served'])
  status!: 'cooking' | 'served';
}
