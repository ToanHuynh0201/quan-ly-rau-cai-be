import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { jwtConfig } from '../../../config';
import type { AccessTokenPayload } from '../../../common/interfaces/jwt-payload.interface';
import { RedisService } from '../redis';
import {
  AUTH_REDIS_NAMESPACE,
  FAILED_TO_ISSUE_REFRESH_TOKEN_MESSAGE,
  INVALID_REFRESH_TOKEN_MESSAGE,
  REFRESH_TOKEN_REVOKED_MESSAGE,
} from './constants';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}

  async issueTokenPair(payload: AccessTokenPayload): Promise<TokenPair> {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.accessSecret,
      expiresIn: this.config.accessExpiresIn as StringValue,
    });

    const jti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: payload.sub, jti },
      {
        secret: this.config.refreshSecret,
        expiresIn: this.config.refreshExpiresIn as StringValue,
      },
    );

    await this.storeRefreshToken(payload.sub, jti, refreshToken);

    return { accessToken, refreshToken };
  }

  async verifyAndConsumeRefreshToken(
    refreshToken: string,
  ): Promise<{ sub: string }> {
    const payload = this.verifyRefreshSignature(refreshToken);
    const client = this.redisService.client;
    const refreshKey = this.refreshKey(payload.sub, payload.jti);
    const storedHash = await client.get(refreshKey);

    if (!storedHash || storedHash !== this.hashToken(refreshToken)) {
      await this.revokeAllSessions(payload.sub);
      throw new UnauthorizedException(REFRESH_TOKEN_REVOKED_MESSAGE);
    }

    await client.del(refreshKey);
    await client.srem(this.sessionsKey(payload.sub), payload.jti);

    return { sub: payload.sub };
  }

  async revokeSession(refreshToken: string): Promise<void> {
    const payload = this.verifyRefreshSignature(refreshToken, {
      ignoreExpiration: true,
    });
    const client = this.redisService.client;
    await client.del(this.refreshKey(payload.sub, payload.jti));
    await client.srem(this.sessionsKey(payload.sub), payload.jti);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    const client = this.redisService.client;
    const sessionsKey = this.sessionsKey(userId);
    const jtis = await client.smembers(sessionsKey);

    if (jtis.length > 0) {
      await client.del(...jtis.map((jti) => this.refreshKey(userId, jti)));
    }
    await client.del(sessionsKey);
  }

  private async storeRefreshToken(
    userId: string,
    jti: string,
    refreshToken: string,
  ): Promise<void> {
    const decoded = this.jwtService.decode<{ exp?: number }>(refreshToken);
    const ttlSeconds = decoded?.exp
      ? decoded.exp - Math.floor(Date.now() / 1000)
      : 0;

    if (ttlSeconds <= 0) {
      throw new UnauthorizedException(FAILED_TO_ISSUE_REFRESH_TOKEN_MESSAGE);
    }

    const client = this.redisService.client;
    await client.set(
      this.refreshKey(userId, jti),
      this.hashToken(refreshToken),
      'EX',
      ttlSeconds,
    );
    await client.sadd(this.sessionsKey(userId), jti);
  }

  private verifyRefreshSignature(
    refreshToken: string,
    options?: { ignoreExpiration?: boolean },
  ): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.refreshSecret,
        ignoreExpiration: options?.ignoreExpiration ?? false,
      });
    } catch {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshKey(userId: string, jti: string): string {
    return `${AUTH_REDIS_NAMESPACE}:refresh:${userId}:${jti}`;
  }

  private sessionsKey(userId: string): string {
    return `${AUTH_REDIS_NAMESPACE}:sessions:${userId}`;
  }
}
