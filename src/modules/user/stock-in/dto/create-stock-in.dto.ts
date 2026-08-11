import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateStockInItemDto } from './create-stock-in-item.dto';

export class CreateStockInDto {
  @IsUUID('4', { message: 'supplierId must be valid UUID' })
  supplierId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateStockInItemDto)
  @ArrayMinSize(1)
  items!: CreateStockInItemDto[];
}
