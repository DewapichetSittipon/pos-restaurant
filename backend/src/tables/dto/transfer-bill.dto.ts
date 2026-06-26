import { IsInt } from 'class-validator';

export class TransferBillDto {
  @IsInt()
  toTableId!: number;
}
