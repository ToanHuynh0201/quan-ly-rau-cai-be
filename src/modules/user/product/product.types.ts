import { Prisma } from '@/generated/prisma/client';

export const productListSelect = {
  id: true,
  code: true,
  name: true,
  unit: true,
  price: true,
  stockQuantity: true,
  minStock: true,
  imageUrl: true,
  isActive: true,
  category: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
} satisfies Prisma.ProductSelect;

export type ProductListItem = Prisma.ProductGetPayload<{
  select: typeof productListSelect;
}>;
