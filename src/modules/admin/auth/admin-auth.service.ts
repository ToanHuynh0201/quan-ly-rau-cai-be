import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../../../generated/prisma/client';
import { TokenPair, TokenService } from '../../shared/token';
import { UsersService } from '../users/users.service';
import {
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_REFRESH_TOKEN_MESSAGE,
} from './constants';
import type { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user || !user.isActive || user.role !== Role.ADMIN) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return this.tokenService.issueTokenPair({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    const { sub } = await this.tokenService.verifyAndConsumeRefreshToken(
      dto.refreshToken,
      Role.ADMIN,
    );

    const user = await this.usersService.findById(sub);
    if (!user || !user.isActive || user.role !== Role.ADMIN) {
      await this.tokenService.revokeAllSessions(sub, Role.ADMIN);
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    return this.tokenService.issueTokenPair({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
  }

  async logout(dto: LogoutDto): Promise<void> {
    await this.tokenService.revokeSession(dto.refreshToken, Role.ADMIN);
  }
}
