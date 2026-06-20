import { IsString, IsArray, ValidateNested, IsEnum, IsNumber, Min, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { Modality } from '@prisma/client';

class BetDto {
  @IsEnum(Modality)
  modality: Modality;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  numbers: string[];

  @IsNumber()
  @Min(1)
  amount: number;
}

export class CreateTicketDto {
  @IsString()
  drawId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BetDto)
  bets: BetDto[];
}
