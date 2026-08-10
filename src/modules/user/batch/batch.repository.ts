import { Batch, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/modules/shared/database';
import { Injectable } from '@nestjs/common';
import { BatchListItem, batchListSelect, Client } from './batch.types';

@Injectable()
export class BatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.BatchWhereInput;
  }): Promise<BatchListItem[]> {
    const { skip, take, where } = params;

    return this.prisma.batch.findMany({
      select: batchListSelect,
      where,
      skip,
      take,
      orderBy: { receivedAt: 'desc' },
    });
  }

  async count(where?: Prisma.BatchWhereInput): Promise<number> {
    return this.prisma.batch.count({ where });
  }

  async findById(id: string): Promise<Batch | null> {
    return this.prisma.batch.findUnique({ where: { id } });
  }

  async createMany(
    data: Prisma.BatchCreateManyInput[],
    client: Client = this.prisma,
  ) {
    return client.batch.createMany({ data });
  }

  async findAvailableByProduct(
    productId: string,
    client: Client = this.prisma,
  ): Promise<Batch[]> {
    return client.batch.findMany({
      where: { productId, remainingQty: { gt: 0 } },
      orderBy: [
        { expiryDate: { sort: 'asc', nulls: 'last' } },
        { receivedAt: 'asc' },
      ],
    });
  }

  async decrementRemaining(
    batchId: string,
    qty: number,
    client: Client = this.prisma,
  ): Promise<Batch> {
    return client.batch.update({
      where: { id: batchId },
      data: { remainingQty: { decrement: qty } },
    });
  }
}
