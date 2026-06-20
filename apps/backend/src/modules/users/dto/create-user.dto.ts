import { IsString, IsEnum, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'Username inválido' })
  username: string;

  @IsString()
  @MinLength(4)
  @MaxLength(8)
  @Matches(/^\d+$/, { message: 'PIN debe ser numérico' })
  pin: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  branchId?: string;
}
