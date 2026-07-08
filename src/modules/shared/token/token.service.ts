import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { jwtAdminConfig, jwtUserConfig } from '../../../config';
import type { AccessTokenPayload } from '../../../common/interfaces/jwt-payload.interface';
import { Role } from '../../../generated/prisma/client';
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

type RoleJwtConfig = ConfigType<typeof jwtUserConfig>;

@Injectable()
export class TokenService {
  private readonly configByRole: Record<Role, RoleJwtConfig>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    @Inject(jwtUserConfig.KEY)
    userConfig: ConfigType<typeof jwtUserConfig>,
    @Inject(jwtAdminConfig.KEY)
    adminConfig: ConfigType<typeof jwtAdminConfig>,
  ) {
    this.configByRole = {
      [Role.USER]: userConfig,
      [Role.ADMIN]: adminConfig,
    };
  }

  async issueTokenPair(payload: AccessTokenPayload): Promise<TokenPair> {
    const config = this.configByRole[payload.role];

    const accessToken = this.jwtService.sign(payload, {
      secret: config.accessSecret,
      expiresIn: config.accessExpiresIn as StringValue,
    });

    const jti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: payload.sub, jti },
      {
        secret: config.refreshSecret,
        expiresIn: config.refreshExpiresIn as StringValue,
      },
    );

    await this.storeRefreshToken(payload.role, payload.sub, jti, refreshToken);

    return { accessToken, refreshToken };
  }

  async verifyAndConsumeRefreshToken(
    refreshToken: string,
    role: Role,
  ): Promise<{ sub: string }> {
    const payload = this.verifyRefreshSignature(refreshToken, role);
    const client = this.redisService.client;
    const refreshKey = this.refreshKey(role, payload.sub, payload.jti);
    const storedHash = await client.get(refreshKey);

    if (!storedHash || storedHash !== this.hashToken(refreshToken)) {
      await this.revokeAllSessions(payload.sub, role);
      throw new UnauthorizedException(REFRESH_TOKEN_REVOKED_MESSAGE);
    }

    await client.del(refreshKey);
    await client.srem(this.sessionsKey(role, payload.sub), payload.jti);

    return { sub: payload.sub };
  }

  async revokeSession(refreshToken: string, role: Role): Promise<void> {
    const payload = this.verifyRefreshSignature(refreshToken, role, {
      ignoreExpiration: true,
    });
    const client = this.redisService.client;
    await client.del(this.refreshKey(role, payload.sub, payload.jti));
    await client.srem(this.sessionsKey(role, payload.sub), payload.jti);
  }

  async revokeAllSessions(userId: string, role: Role): Promise<void> {
    const client = this.redisService.client;
    const sessionsKey = this.sessionsKey(role, userId);
    const jtis = await client.smembers(sessionsKey);

    if (jtis.length > 0) {
      await client.del(
        ...jtis.map((jti) => this.refreshKey(role, userId, jti)),
      );
    }
    await client.del(sessionsKey);
  }

  private async storeRefreshToken(
    role: Role,
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
      this.refreshKey(role, userId, jti),
      this.hashToken(refreshToken),
      'EX',
      ttlSeconds,
    );
    await client.sadd(this.sessionsKey(role, userId), jti);
  }

  private verifyRefreshSignature(
    refreshToken: string,
    role: Role,
    options?: { ignoreExpiration?: boolean },
  ): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.configByRole[role].refreshSecret,
        ignoreExpiration: options?.ignoreExpiration ?? false,
      });
    } catch {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshKey(role: Role, userId: string, jti: string): string {
    return `${AUTH_REDIS_NAMESPACE}:${role.toLowerCase()}:refresh:${userId}:${jti}`;
  }

  private sessionsKey(role: Role, userId: string): string {
    return `${AUTH_REDIS_NAMESPACE}:${role.toLowerCase()}:sessions:${userId}`;
  }
}
