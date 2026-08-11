import { PartialType } from '@nestjs/mapped-types';
import { CreateStockInDto } from './create-stock-in.dto';

export class UpdateStockInDto extends PartialType(CreateStockInDto) {}
