import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryBatchDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4')
  productId?: string;

  @IsOptional()
  @IsDateString()
  expiringBefore?: string;
}
