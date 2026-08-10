import { REGEX } from '@/common/constants';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactName?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.PHONE_NUMBER, {
    message: 'phone must be a valid phone number',
  })
  phone!: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Matches(REGEX.TAX_CODE, { message: 'taxCode must be 10 or 13 digits' })
  taxCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
