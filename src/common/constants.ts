export const API_PREFIX = 'api/v1';

/**
 * Route tương đối (không gồm global prefix) vì e2e test dựng app qua
 * TestingModule không đi qua bootstrap() của main.ts nên không có prefix.
 */
export const HEALTH_CHECK_PATH = '/health';
