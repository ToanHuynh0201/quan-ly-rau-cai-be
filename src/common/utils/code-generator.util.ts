import { randomInt } from 'crypto';

export function generateCode(prefix: string): string {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  const randomPart = randomInt(0, 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0');

  return `${prefix}-${datePart}-${randomPart}`;
}
