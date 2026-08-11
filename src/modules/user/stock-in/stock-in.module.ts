import { Module } from '@nestjs/common';
import { StockInController } from './stock-in.controller';
import { StockInService } from './stock-in.service';
import { StockInRepository } from './stock-in.repository';
import { SupplierModule } from '../suppliers/suppliers.module';
import { ProductModule } from '../product/product.module';
import { BatchModule } from '../batch/batch.module';

@Module({
  imports: [SupplierModule, ProductModule, BatchModule],
  controllers: [StockInController],
  providers: [StockInService, StockInRepository],
  exports: [StockInService],
})
export class StockInModule {}
