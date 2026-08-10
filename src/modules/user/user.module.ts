import { Module } from '@nestjs/common';
import { SupplierModule } from './suppliers/suppliers.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [SupplierModule, CategoryModule, ProductModule],
  exports: [SupplierModule, CategoryModule, ProductModule],
})
export class UserModule {}
