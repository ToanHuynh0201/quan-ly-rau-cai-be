import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BatchRepository } from './batch.repository';
import { QueryBatchDto } from './query-batch.dto';
import { generateCode, paginationMeta, paginationSkip } from '@/common/utils';
import { Prisma, StockMovementType } from '@/generated/prisma/client';
import { Client, CreateBatchesForStockIn } from './batch.types';

@Injectable()
export class BatchService {
  constructor(private readonly batchRepository: BatchRepository) {}

  async findAll(query: QueryBatchDto) {
    const { page = 1, limit = 10, productId, expiringBefore } = query;

    const skip = paginationSkip(page, limit);

    const where: Prisma.BatchWhereInput = {};
    if (productId) where.productId = productId;
    if (expiringBefore) where.expiryDate = { lte: new Date(expiringBefore) };

    const [data, total] = await Promise.all([
      this.batchRepository.findMany({ skip, take: limit, where }),
      this.batchRepository.count(where),
    ]);

    return { batches: data, metadata: paginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    const batch = await this.batchRepository.findById(id);
    if (!batch) throw new NotFoundException(`Batch with ${id} not found`);
    return batch;
  }

  async createBatchesForStockIn(
    items: CreateBatchesForStockIn[],
    receivedAt: Date,
    tx: Prisma.TransactionClient,
  ) {
    const data: Prisma.BatchCreateManyInput[] = items.map((item) => ({
      code: generateCode(`LOT`),
      productId: item.productId,
      stockInItemId: item.id,
      initialQty: item.quantity,
      remainingQty: item.quantity,
      costPrice: item.costPrice,
      expiryDate: item.expiryDate,
      receivedAt,
    }));

    await this.batchRepository.createMany(data, tx);
  }

  async deductStock(productId: string, qty: number, tx: Client) {
    let remaining = qty;

    while (remaining > 0) {
      const batches = await this.batchRepository.findAvailableByProduct(
        productId,
        tx,
      );

      if (batches.length === 0) break;

      let progressed = false;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const take = Math.min(Number(batch.remainingQty), remaining);
        if (take <= 0) continue;

        const ok = await this.batchRepository.decrementRemaining(
          batch.id,
          take,
          tx,
        );
        if (!ok) continue;

        await this.batchRepository.recordMovement(
          { batchId: batch.id, type: StockMovementType.OUT, quantity: take },
          tx,
        );

        remaining -= take;
        progressed = true;
      }

      if (!progressed) break;
    }

    if (remaining > 0)
      throw new BadRequestException(
        `Not enough stock for product ${productId}`,
      );
  }
}
