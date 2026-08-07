import { Module } from '@nestjs/common';
import { SupplierController } from './suppliers.controller';
import { SupplierService } from './suppliers.service';
import { SuppliersRepository } from './suppliers.repository';

@Module({
  controllers: [SupplierController],
  providers: [SupplierService, SuppliersRepository],
  exports: [SupplierService],
})
export class SupplierModule {}
