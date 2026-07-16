import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'crypto';
import { jwtConfig } from '../../../config';
import { Role } from '../../../generated/prisma/client';
import { RedisService } from '../redis';
import {
  AUTH_REDIS_NAMESPACE,
  FAILED_TO_ISSUE_REFRESH_TOKEN_MESSAGE,
  INVALID_REFRESH_TOKEN_MESSAGE,
  REFRESH_TOKEN_REVOKED_MESSAGE,
} from './constants';
import { TokenService } from './token.service';

const config = {
  accessSecret: 'access-secret',
  accessExpiresIn: '15m',
  refreshSecret: 'refresh-secret',
  refreshExpiresIn: '7d',
};

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign' | 'verify' | 'decode'>>;
  let redisClient: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    sadd: jest.Mock;
    srem: jest.Mock;
    smembers: jest.Mock;
  };

  beforeEach(async () => {
    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
      decode: jest.fn(),
    };
    redisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: { client: redisClient } },
        { provide: jwtConfig.KEY, useValue: config },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('issueTokenPair', () => {
    const payload = { sub: 'user-1', username: 'alice', role: Role.USER };

    beforeEach(() => {
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      jwtService.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 900,
      });
    });

    it('signs the access token with the access secret and expiry', async () => {
      await service.issueTokenPair(payload);

      expect(jwtService.sign).toHaveBeenNthCalledWith(1, payload, {
        secret: config.accessSecret,
        expiresIn: config.accessExpiresIn,
      });
    });

    it('signs the refresh token containing only sub and jti (no username/role leak)', async () => {
      await service.issueTokenPair(payload);

      const [refreshPayload, refreshOptions] = jwtService.sign.mock.calls[1];
      expect(refreshPayload).toEqual({
        sub: payload.sub,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.any() is typed `any` in @types/jest
        jti: expect.any(String),
      });
      expect(refreshOptions).toEqual({
        secret: config.refreshSecret,
        expiresIn: config.refreshExpiresIn,
      });
    });

    it('signs admin payloads with the same shared secrets', async () => {
      const adminPayload = { ...payload, role: Role.ADMIN };

      await service.issueTokenPair(adminPayload);

      expect(jwtService.sign).toHaveBeenNthCalledWith(1, adminPayload, {
        secret: config.accessSecret,
        expiresIn: config.accessExpiresIn,
      });
      const [, refreshOptions] = jwtService.sign.mock.calls[1];
      expect(refreshOptions).toEqual({
        secret: config.refreshSecret,
        expiresIn: config.refreshExpiresIn,
      });
    });

    it('stores the hashed refresh token in redis under the namespaced key with the computed ttl', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const nowSeconds = Math.floor(Date.now() / 1000);
      jwtService.decode.mockReturnValue({ exp: nowSeconds + 900 });

      await service.issueTokenPair(payload);

      const jti = (jwtService.sign.mock.calls[1][0] as { jti: string }).jti;
      expect(redisClient.set).toHaveBeenCalledWith(
        `${AUTH_REDIS_NAMESPACE}:refresh:${payload.sub}:${jti}`,
        hashToken('refresh-token'),
        'EX',
        900,
      );
      expect(redisClient.sadd).toHaveBeenCalledWith(
        `${AUTH_REDIS_NAMESPACE}:sessions:${payload.sub}`,
        jti,
      );
    });

    it('returns the signed access and refresh tokens', async () => {
      const result = await service.issueTokenPair(payload);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('throws FAILED_TO_ISSUE_REFRESH_TOKEN_MESSAGE when decode returns null', async () => {
      jwtService.decode.mockReturnValue(null);

      await expect(service.issueTokenPair(payload)).rejects.toThrow(
        new UnauthorizedException(FAILED_TO_ISSUE_REFRESH_TOKEN_MESSAGE),
      );
      expect(redisClient.set).not.toHaveBeenCalled();
      expect(redisClient.sadd).not.toHaveBeenCalled();
    });

    it('throws FAILED_TO_ISSUE_REFRESH_TOKEN_MESSAGE when the decoded exp is already in the past', async () => {
      jwtService.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) - 10,
      });

      await expect(service.issueTokenPair(payload)).rejects.toThrow(
        new UnauthorizedException(FAILED_TO_ISSUE_REFRESH_TOKEN_MESSAGE),
      );
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('throws FAILED_TO_ISSUE_REFRESH_TOKEN_MESSAGE when the decoded token has no exp property', async () => {
      jwtService.decode.mockReturnValue({});

      await expect(service.issueTokenPair(payload)).rejects.toThrow(
        new UnauthorizedException(FAILED_TO_ISSUE_REFRESH_TOKEN_MESSAGE),
      );
      expect(redisClient.set).not.toHaveBeenCalled();
    });
  });

  describe('verifyAndConsumeRefreshToken', () => {
    const userId = 'user-1';
    const jti = 'jti-1';
    const refreshToken = 'refresh-token';

    it('throws INVALID_REFRESH_TOKEN_MESSAGE when the signature verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.verifyAndConsumeRefreshToken(refreshToken),
      ).rejects.toThrow(
        new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE),
      );
      expect(redisClient.get).not.toHaveBeenCalled();
    });

    it('throws INVALID_REFRESH_TOKEN_MESSAGE for any verify error shape (malformed token)', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new SyntaxError('malformed');
      });

      await expect(
        service.verifyAndConsumeRefreshToken(refreshToken),
      ).rejects.toThrow(
        new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE),
      );
    });

    it('revokes all sessions and throws REFRESH_TOKEN_REVOKED_MESSAGE when no hash is stored', async () => {
      jwtService.verify.mockReturnValue({ sub: userId, jti });
      redisClient.get.mockResolvedValue(null);
      const revokeAllSpy = jest
        .spyOn(service, 'revokeAllSessions')
        .mockResolvedValue();

      await expect(
        service.verifyAndConsumeRefreshToken(refreshToken),
      ).rejects.toThrow(
        new UnauthorizedException(REFRESH_TOKEN_REVOKED_MESSAGE),
      );
      expect(revokeAllSpy).toHaveBeenCalledWith(userId);
    });

    it('revokes all sessions and throws REFRESH_TOKEN_REVOKED_MESSAGE when the stored hash does not match (reuse/theft)', async () => {
      jwtService.verify.mockReturnValue({ sub: userId, jti });
      redisClient.get.mockResolvedValue('some-other-hash');
      const revokeAllSpy = jest
        .spyOn(service, 'revokeAllSessions')
        .mockResolvedValue();

      await expect(
        service.verifyAndConsumeRefreshToken(refreshToken),
      ).rejects.toThrow(
        new UnauthorizedException(REFRESH_TOKEN_REVOKED_MESSAGE),
      );
      expect(revokeAllSpy).toHaveBeenCalledWith(userId);
      expect(redisClient.del).not.toHaveBeenCalled();
    });

    it('consumes the refresh token on success: deletes the key and removes the jti from the session set', async () => {
      jwtService.verify.mockReturnValue({ sub: userId, jti });
      redisClient.get.mockResolvedValue(hashToken(refreshToken));
      const revokeAllSpy = jest.spyOn(service, 'revokeAllSessions');

      const result = await service.verifyAndConsumeRefreshToken(refreshToken);

      expect(result).toEqual({ sub: userId });
      expect(redisClient.del).toHaveBeenCalledWith(
        `${AUTH_REDIS_NAMESPACE}:refresh:${userId}:${jti}`,
      );
      expect(redisClient.srem).toHaveBeenCalledWith(
        `${AUTH_REDIS_NAMESPACE}:sessions:${userId}`,
        jti,
      );
      expect(revokeAllSpy).not.toHaveBeenCalled();
    });

    it('verifies refresh tokens against the shared refresh secret', async () => {
      jwtService.verify.mockReturnValue({ sub: userId, jti });
      redisClient.get.mockResolvedValue(hashToken(refreshToken));

      await service.verifyAndConsumeRefreshToken(refreshToken);

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: config.refreshSecret,
        ignoreExpiration: false,
      });
    });
  });

  describe('revokeSession', () => {
    const userId = 'user-1';
    const jti = 'jti-1';
    const refreshToken = 'refresh-token';

    it('verifies the signature with ignoreExpiration true so expired tokens can still log out', async () => {
      jwtService.verify.mockReturnValue({ sub: userId, jti });

      await service.revokeSession(refreshToken);

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: config.refreshSecret,
        ignoreExpiration: true,
      });
    });

    it('throws INVALID_REFRESH_TOKEN_MESSAGE when verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('bad signature');
      });

      await expect(service.revokeSession(refreshToken)).rejects.toThrow(
        new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE),
      );
      expect(redisClient.del).not.toHaveBeenCalled();
    });

    it('deletes the refresh key and removes the jti from the session set without reading the stored hash', async () => {
      jwtService.verify.mockReturnValue({ sub: userId, jti });

      await service.revokeSession(refreshToken);

      expect(redisClient.get).not.toHaveBeenCalled();
      expect(redisClient.del).toHaveBeenCalledWith(
        `${AUTH_REDIS_NAMESPACE}:refresh:${userId}:${jti}`,
      );
      expect(redisClient.srem).toHaveBeenCalledWith(
        `${AUTH_REDIS_NAMESPACE}:sessions:${userId}`,
        jti,
      );
    });
  });

  describe('revokeAllSessions', () => {
    const userId = 'user-1';

    it('only deletes the sessions key when there are no active sessions', async () => {
      redisClient.smembers.mockResolvedValue([]);

      await service.revokeAllSessions(userId);

      expect(redisClient.del).toHaveBeenCalledTimes(1);
      expect(redisClient.del).toHaveBeenCalledWith(
        `${AUTH_REDIS_NAMESPACE}:sessions:${userId}`,
      );
    });

    it('bulk-deletes every refresh key plus the sessions key when sessions exist', async () => {
      redisClient.smembers.mockResolvedValue(['jti-1', 'jti-2']);

      await service.revokeAllSessions(userId);

      expect(redisClient.del).toHaveBeenCalledTimes(2);
      expect(redisClient.del).toHaveBeenNthCalledWith(
        1,
        `${AUTH_REDIS_NAMESPACE}:refresh:${userId}:jti-1`,
        `${AUTH_REDIS_NAMESPACE}:refresh:${userId}:jti-2`,
      );
      expect(redisClient.del).toHaveBeenNthCalledWith(
        2,
        `${AUTH_REDIS_NAMESPACE}:sessions:${userId}`,
      );
    });
  });
});
