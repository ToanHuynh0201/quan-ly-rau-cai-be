import { Module } from '@nestjs/common';
import { SupplierModule } from './suppliers/suppliers.module';

@Module({
  imports: [SupplierModule],
  exports: [SupplierModule],
})
export class UserModule {}
