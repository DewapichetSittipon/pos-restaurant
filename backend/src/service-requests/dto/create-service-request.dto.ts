import { IsIn } from 'class-validator';

export class CreateServiceRequestDto {
  @IsIn(['call_staff', 'call_bill'])
  type!: 'call_staff' | 'call_bill';
}
