import { Prisma } from '@/generated/prisma/client';

export const supplierListSelect = {
  id: true,
  code: true,
  name: true,
  contactName: true,
  phone: true,
  email: true,
} satisfies Prisma.SupplierSelect;

export type SupplierListItem = Prisma.SupplierGetPayload<{
  select: typeof supplierListSelect;
}>;
