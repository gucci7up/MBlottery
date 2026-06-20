import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Z0-9]+$/, { message: 'Código solo puede contener letras mayúsculas y números' })
  code: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
