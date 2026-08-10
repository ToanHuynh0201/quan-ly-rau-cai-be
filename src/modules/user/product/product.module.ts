import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import { CategoryModule } from '../category/category.module';
import { SupplierModule } from '../suppliers/suppliers.module';

@Module({
  imports: [CategoryModule, SupplierModule],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
  exports: [ProductService],
})
export class ProductModule {}
