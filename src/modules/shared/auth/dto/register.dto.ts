import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_MIN_LENGTH } from '../constants';
import { Match } from '../../../../common/decorators/match.decorator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(72)
  password!: string;

  @IsString()
  @Match('password')
  confirmPassword!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
