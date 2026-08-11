import { Prisma, StockIn, StockInStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/modules/shared/database';
import { Injectable } from '@nestjs/common';
import {
  Client,
  StockInDetail,
  stockInDetailInclude,
  StockInItemInput,
  StockInListItem,
  stockInListSelect,
} from './stock-in.types';

@Injectable()
export class StockInRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    code: string;
    supplierId: string;
    note?: string;
    items: StockInItemInput[];
  }): Promise<StockIn> {
    return this.prisma.stockIn.create({
      data: {
        code: data.code,
        supplierId: data.supplierId,
        note: data.note,
        items: { create: data.items },
      },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.StockInWhereInput;
  }): Promise<StockInListItem[]> {
    const { skip, take, where } = params;

    return this.prisma.stockIn.findMany({
      select: stockInListSelect,
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(where?: Prisma.StockInWhereInput): Promise<number> {
    return this.prisma.stockIn.count({ where });
  }

  async findById(id: string): Promise<StockInDetail | null> {
    return this.prisma.stockIn.findUnique({
      where: { id },
      include: stockInDetailInclude,
    });
  }

  async findStatusById(
    id: string,
    client: Client = this.prisma,
  ): Promise<StockIn | null> {
    return client.stockIn.findUnique({ where: { id } });
  }

  async replaceItems(
    id: string,
    data: {
      supplierId?: string;
      note?: string;
      items?: StockInItemInput[];
    },
  ): Promise<StockIn> {
    return this.prisma.stockIn.update({
      where: { id },
      data: {
        supplierId: data.supplierId,
        note: data.note,
        ...(data.items && {
          items: { deleteMany: {}, create: data.items },
        }),
      },
    });
  }

  async remove(id: string): Promise<StockIn> {
    return this.prisma.stockIn.delete({ where: { id } });
  }

  async tryConfirm(
    id: string,
    tx: Prisma.TransactionClient,
  ): Promise<StockInDetail | null> {
    const { count } = await tx.stockIn.updateMany({
      where: { id, status: StockInStatus.DRAFT },
      data: { status: StockInStatus.CONFIRMED, confirmedAt: new Date() },
    });

    if (count === 0) return null;

    return tx.stockIn.findUnique({
      where: { id },
      include: stockInDetailInclude,
    });
  }
}
