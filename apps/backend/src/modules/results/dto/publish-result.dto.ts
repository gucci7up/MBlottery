import { IsString, IsOptional, IsArray, Length, Matches } from 'class-validator';

const TWO_DIGITS = /^\d{2}$/;

export class PublishResultDto {
  @IsString()
  drawId: string;

  @IsString()
  @Length(2, 2)
  @Matches(TWO_DIGITS, { message: 'El primer premio debe ser un número de 2 dígitos (00-99)' })
  firstPrize: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(TWO_DIGITS, { message: 'El segundo premio debe ser un número de 2 dígitos' })
  secondPrize?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(TWO_DIGITS, { message: 'El tercer premio debe ser un número de 2 dígitos' })
  thirdPrize?: string;

  @IsOptional()
  @IsArray()
  extraNumbers?: string[];

  @IsOptional()
  @IsString()
  source?: string;
}
