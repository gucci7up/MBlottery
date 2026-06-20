import { IsString, IsEmail, IsOptional, MinLength, Matches } from 'class-validator';

export class CreateOperatorDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug solo puede contener letras minúsculas, números y guiones' })
  slug: string;

  @IsEmail()
  contactEmail: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  rncOrId?: string;
}
