import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateDrawDto {
  @IsString()
  providerId: string;

  @IsString()
  name: string;

  @IsDateString()
  scheduledAt: string;

  @IsDateString()
  openAt: string;

  @IsDateString()
  closeAt: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
