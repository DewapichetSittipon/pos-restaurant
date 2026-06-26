import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @MaxLength(100)
  customerName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsInt()
  @Min(1)
  partySize!: number;

  // วันเวลาที่นัด (ISO 8601)
  @IsISO8601()
  reservedAt!: string;

  @IsOptional()
  @IsInt()
  tableId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
