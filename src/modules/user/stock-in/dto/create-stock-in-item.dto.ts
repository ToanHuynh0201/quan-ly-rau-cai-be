import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateStockInItemDto {
  @IsUUID('4', { message: 'productId must be valid UUID' })
  productId!: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  costPrice!: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
