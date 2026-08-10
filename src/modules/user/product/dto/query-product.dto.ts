import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryProductDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsUUID('4')
  supplierId?: string;
}
