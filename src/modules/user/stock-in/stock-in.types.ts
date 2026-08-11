import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/modules/shared/database';

export type Client = PrismaService | Prisma.TransactionClient;

export const stockInListSelect = {
  id: true,
  code: true,
  status: true,
  confirmedAt: true,
  createdAt: true,
  supplier: { select: { id: true, name: true } },
} satisfies Prisma.StockInSelect;

export type StockInListItem = Prisma.StockInGetPayload<{
  select: typeof stockInListSelect;
}>;

export const stockInDetailInclude = {
  supplier: { select: { id: true, name: true } },
  items: {
    include: {
      product: { select: { id: true, code: true, name: true, unit: true } },
      batch: true,
    },
  },
} satisfies Prisma.StockInInclude;

export type StockInDetail = Prisma.StockInGetPayload<{
  include: typeof stockInDetailInclude;
}>;

export type StockInItemInput = {
  productId: string;
  quantity: number;
  costPrice: number;
  lineTotal: number;
  expiryDate?: Date;
};
