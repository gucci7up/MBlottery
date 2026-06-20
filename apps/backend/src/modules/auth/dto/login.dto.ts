import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  username: string;

  @IsString()
  @MinLength(4)
  @MaxLength(8)
  @Matches(/^\d+$/, { message: 'PIN debe contener solo dígitos' })
  pin: string;
}
