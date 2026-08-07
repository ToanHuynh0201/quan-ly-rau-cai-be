import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import {
  EMAIL_ALREADY_REGISTERED_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_REFRESH_TOKEN_MESSAGE,
  PASSWORD_SALT_ROUNDS,
  USERNAME_ALREADY_REGISTERED_MESSAGE,
} from './constants';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users';
import { TokenPair, TokenService } from '../token';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<
    TokenPair & { user: { id: string; username: string; email: string | null } }
  > {
    const existingUsername = await this.usersService.findByUsername(
      dto.username,
    );
    if (existingUsername) {
      throw new ConflictException(USERNAME_ALREADY_REGISTERED_MESSAGE);
    }

    if (dto.email) {
      const existingEmail = await this.usersService.findByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException(EMAIL_ALREADY_REGISTERED_MESSAGE);
      }
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      PASSWORD_SALT_ROUNDS,
    );
    const user = await this.usersService.create({
      username: dto.username,
      password: hashedPassword,
      email: dto.email,
    });

    const tokens = await this.tokenService.issueTokenPair({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      ...tokens,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user || !user.isActive) {
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

  async refresh(refreshToken: string): Promise<TokenPair> {
    const { sub } =
      await this.tokenService.verifyAndConsumeRefreshToken(refreshToken);
    const user = await this.usersService.findById(sub);
    if (!user || !user.isActive) {
      await this.tokenService.revokeAllSessions(sub);
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    return this.tokenService.issueTokenPair({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeSession(refreshToken);
  }
}
