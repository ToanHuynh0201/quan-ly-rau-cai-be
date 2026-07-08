export const API_PREFIX = 'api/v1';

/**
 * Relative route (without the global prefix) because e2e tests build the app
 * via TestingModule, which doesn't go through main.ts's bootstrap(), so there's no prefix.
 */
export const HEALTH_CHECK_PATH = '/health';
