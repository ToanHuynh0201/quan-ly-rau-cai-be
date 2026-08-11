import { Module } from '@nestjs/common';
import { SupplierModule } from './suppliers/suppliers.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { BatchModule } from './batch/batch.module';
import { StockInModule } from './stock-in/stock-in.module';

@Module({
  imports: [
    SupplierModule,
    CategoryModule,
    ProductModule,
    BatchModule,
    StockInModule,
  ],
  exports: [
    SupplierModule,
    CategoryModule,
    ProductModule,
    BatchModule,
    StockInModule,
  ],
})
export class UserModule {}
