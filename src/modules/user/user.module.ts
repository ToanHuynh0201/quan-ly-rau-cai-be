import { Module } from '@nestjs/common';
import { SupplierModule } from './suppliers/suppliers.module';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [SupplierModule, CategoryModule],
  exports: [SupplierModule, CategoryModule],
})
export class UserModule {}
