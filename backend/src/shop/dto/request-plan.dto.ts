import { IsString } from 'class-validator';

// ร้านกดขออัปเกรดแพ็กเกจ (อ้าง Plan.key)
export class RequestPlanDto {
  @IsString()
  planKey!: string;
}
