import { Prisma } from '@/generated/prisma/client';

export const categoryListSelect = {
  id: true,
  code: true,
  name: true,
  slug: true,
  icon: true,
  parentId: true,
} satisfies Prisma.CategorySelect;

export type CategoryListItem = Prisma.CategoryGetPayload<{
  select: typeof categoryListSelect;
}>;
