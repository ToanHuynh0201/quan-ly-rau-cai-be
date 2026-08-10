import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { IsOptional, IsString } from 'class-validator';

export class QueryCategoryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
