import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { StockInStatus } from '@/generated/prisma/enums';

export class QueryStockInDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID('4')
  supplierId?: string;

  @IsOptional()
  @IsEnum(StockInStatus)
  status?: StockInStatus;
}
