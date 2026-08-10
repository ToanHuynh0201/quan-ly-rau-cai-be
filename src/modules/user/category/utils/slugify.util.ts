import { REGEX } from '@/common/constants';
import { BadRequestException } from '@nestjs/common';

export function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(REGEX.COMBINING_MARKS, '')
    .replace(REGEX.LETTER_D, 'd')
    .toLowerCase()
    .replace(REGEX.NON_ALPHANUMERIC, '-')
    .replace(REGEX.TRIM_HYPHENS, '');

  if (!slug) throw new BadRequestException('Cannot generate valid slug');
  return slug;
}
