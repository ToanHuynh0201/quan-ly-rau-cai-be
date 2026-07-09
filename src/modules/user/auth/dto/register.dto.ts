import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from '../../../../common/decorators/match.decorator';
import { PASSWORD_MIN_LENGTH } from '../constants';

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
