import { IsString, IsOptional, IsDateString, IsArray, ValidateNested, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Modality } from '@prisma/client';

class PayoutEntryDto {
  @IsEnum(Modality)
  modality: Modality;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsNumber()
  @Min(1)
  multiplier: number;

  @IsNumber()
  @Min(0)
  minBetAmount: number;

  @IsNumber()
  @Min(1)
  maxBetAmount: number;
}

export class CreatePayoutTableDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayoutEntryDto)
  entries: PayoutEntryDto[];
}
