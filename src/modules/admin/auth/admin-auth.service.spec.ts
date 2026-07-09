import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import type { User } from '../../../generated/prisma/client';
import { Role } from '../../../generated/prisma/client';
import { TokenService } from '../../shared/token';
import { UsersService } from '../users/users.service';
import {
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_REFRESH_TOKEN_MESSAGE,
} from './constants';
import { AdminAuthService } from './admin-auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const compareMock = bcrypt.compare as jest.Mock;

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'admin-1',
  username: 'root',
  email: 'root@example.com',
  password: 'hashed-password',
  role: Role.ADMIN,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByUsername' | 'findById'>
  >;
  let tokenService: jest.Mocked<
    Pick<
      TokenService,
      | 'issueTokenPair'
      | 'verifyAndConsumeRefreshToken'
      | 'revokeSession'
      | 'revokeAllSessions'
    >
  >;

  beforeEach(async () => {
    usersService = {
      findByUsername: jest.fn(),
      findById: jest.fn(),
    };
    tokenService = {
      issueTokenPair: jest.fn(),
      verifyAndConsumeRefreshToken: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllSessions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: UsersService, useValue: usersService },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get<AdminAuthService>(AdminAuthService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('login', () => {
    const dto = { username: 'root', password: 'plain-password' };

    it('throws UnauthorizedException when the user does not exist', async () => {
      usersService.findByUsername.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
      );
      expect(compareMock).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the admin account is inactive', async () => {
      usersService.findByUsername.mockResolvedValue(
        buildUser({ isActive: false }),
      );

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
      );
      expect(compareMock).not.toHaveBeenCalled();
    });

    it('rejects a valid, active USER-role account without ever comparing the password', async () => {
      usersService.findByUsername.mockResolvedValue(
        buildUser({ role: Role.USER }),
      );

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
      );
      expect(compareMock).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      usersService.findByUsername.mockResolvedValue(buildUser());
      compareMock.mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
      );
      expect(tokenService.issueTokenPair).not.toHaveBeenCalled();
    });

    it('issues a token pair for a valid admin login', async () => {
      const admin = buildUser();
      usersService.findByUsername.mockResolvedValue(admin);
      compareMock.mockResolvedValue(true);
      tokenService.issueTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await service.login(dto);

      expect(tokenService.issueTokenPair).toHaveBeenCalledWith({
        sub: admin.id,
        username: admin.username,
        role: admin.role,
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('refresh', () => {
    const refreshToken = 'refresh-token';

    it('calls verifyAndConsumeRefreshToken scoped to Role.ADMIN', async () => {
      tokenService.verifyAndConsumeRefreshToken.mockResolvedValue({
        sub: 'admin-1',
      });
      usersService.findById.mockResolvedValue(buildUser());
      tokenService.issueTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'new-refresh-token',
      });

      await service.refresh({ refreshToken });

      expect(tokenService.verifyAndConsumeRefreshToken).toHaveBeenCalledWith(
        refreshToken,
        Role.ADMIN,
      );
    });

    it('revokes all sessions before throwing when the user no longer exists', async () => {
      tokenService.verifyAndConsumeRefreshToken.mockResolvedValue({
        sub: 'admin-1',
      });
      usersService.findById.mockResolvedValue(null);

      await expect(service.refresh({ refreshToken })).rejects.toThrow(
        new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE),
      );
      expect(tokenService.revokeAllSessions).toHaveBeenCalledWith(
        'admin-1',
        Role.ADMIN,
      );
    });

    it('revokes all sessions before throwing when the admin account is inactive', async () => {
      tokenService.verifyAndConsumeRefreshToken.mockResolvedValue({
        sub: 'admin-1',
      });
      usersService.findById.mockResolvedValue(buildUser({ isActive: false }));

      await expect(service.refresh({ refreshToken })).rejects.toThrow(
        new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE),
      );
      expect(tokenService.revokeAllSessions).toHaveBeenCalledWith(
        'admin-1',
        Role.ADMIN,
      );
    });

    it('revokes all sessions before throwing when the account role was downgraded to USER', async () => {
      tokenService.verifyAndConsumeRefreshToken.mockResolvedValue({
        sub: 'admin-1',
      });
      usersService.findById.mockResolvedValue(buildUser({ role: Role.USER }));

      await expect(service.refresh({ refreshToken })).rejects.toThrow(
        new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE),
      );
      expect(tokenService.revokeAllSessions).toHaveBeenCalledWith(
        'admin-1',
        Role.ADMIN,
      );
    });

    it('issues a new token pair on success without revoking sessions', async () => {
      const admin = buildUser();
      tokenService.verifyAndConsumeRefreshToken.mockResolvedValue({
        sub: admin.id,
      });
      usersService.findById.mockResolvedValue(admin);
      tokenService.issueTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await service.refresh({ refreshToken });

      expect(tokenService.issueTokenPair).toHaveBeenCalledWith({
        sub: admin.id,
        username: admin.username,
        role: admin.role,
      });
      expect(tokenService.revokeAllSessions).not.toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'new-refresh-token',
      });
    });
  });

  describe('logout', () => {
    it('revokes the session scoped to Role.ADMIN', async () => {
      await service.logout({ refreshToken: 'refresh-token' });

      expect(tokenService.revokeSession).toHaveBeenCalledWith(
        'refresh-token',
        Role.ADMIN,
      );
    });
  });
});
