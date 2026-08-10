export const API_PREFIX = 'api/v1';

/**
 * Relative route (without the global prefix) because e2e tests build the app
 * via TestingModule, which doesn't go through main.ts's bootstrap(), so there's no prefix.
 */
export const HEALTH_CHECK_PATH = '/health';

export const REGEX = {
  JWT_TOKEN: /^\d+(\.\d+)?(ms|s|m|h|d|w|y)$/i,
  SLUG: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  PHONE_NUMBER: /^[0-9+\-\s]{8,20}$/,
  TAX_CODE: /^\d{10}(\d{3})?$/,

  COMBINING_MARKS: /[\u0300-\u036f]/g,
  LETTER_D: /đ/gi,
  NON_ALPHANUMERIC: /[^a-z0-9]+/g,
  TRIM_HYPHENS: /^-+|-+$/g,
};
