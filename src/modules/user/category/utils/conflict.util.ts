import { Prisma } from '@/generated/prisma/client';

export function conflictField(
  error: Prisma.PrismaClientKnownRequestError,
): string {
  const target = error.meta?.target;
  if (Array.isArray(target) && target.includes('slug')) return 'slug';
  return 'code';
}
