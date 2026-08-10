import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { BatchRepository } from './batch.repository';

@Module({
  controllers: [BatchController],
  providers: [BatchService, BatchRepository],
  exports: [BatchService],
})
export class BatchModule {}
