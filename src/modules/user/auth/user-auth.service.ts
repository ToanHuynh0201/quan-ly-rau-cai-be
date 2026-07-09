import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../../../generated/prisma/client';
import { TokenPair, TokenService } from '../../shared/token';
import { UsersService } from '../users/users.service';
import {
  EMAIL_ALREADY_REGISTERED_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_REFRESH_TOKEN_MESSAGE,
  PASSWORD_SALT_ROUNDS,
  USERNAME_ALREADY_REGISTERED_MESSAGE,
} from './constants';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

@Injectable()
export class UserAuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<TokenPair & { user: { id: string; username: string } }> {
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

    return { ...tokens, user: { id: user.id, username: user.username } };
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user || !user.isActive || user.role !== Role.USER) {
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
    const { sub } = await this.tokenService.verifyAndConsumeRefreshToken(
      refreshToken,
      Role.USER,
    );
    const user = await this.usersService.findById(sub);
    if (!user || !user.isActive || user.role !== Role.USER) {
      await this.tokenService.revokeAllSessions(sub, Role.USER);
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    return this.tokenService.issueTokenPair({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeSession(refreshToken, Role.USER);
  }
}
