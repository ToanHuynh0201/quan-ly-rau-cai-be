import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/modules/shared/database';

export const batchListSelect = {
  id: true,
  code: true,
  initialQty: true,
  remainingQty: true,
  costPrice: true,
  expiryDate: true,
  receivedAt: true,
  product: { select: { id: true, code: true, name: true, unit: true } },
} satisfies Prisma.BatchSelect;

export type BatchListItem = Prisma.BatchGetPayload<{
  select: typeof batchListSelect;
}>;

export type Client = PrismaService | Prisma.TransactionClient;

export type CreateBatchesForStockIn = {
  id: string;
  productId: string;
  quantity: Prisma.Decimal | number;
  costPrice: Prisma.Decimal | number;
  expiryDate: Date | null;
};
