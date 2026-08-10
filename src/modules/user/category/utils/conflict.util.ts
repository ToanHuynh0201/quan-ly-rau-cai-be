import { Prisma } from '@/generated/prisma/client';

export function conflictField(
  error: Prisma.PrismaClientKnownRequestError,
): string {
  const target = error.meta?.target;
  if (Array.isArray(target) && target.length > 0) return String(target[0]);
  return 'field';
}
