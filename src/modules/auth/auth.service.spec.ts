import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import type { User } from '../../generated/prisma/client';
import { Role } from '../../generated/prisma/client';
import { TokenService } from '../shared/token';
import { UsersService } from '../shared/users';
import {
  EMAIL_ALREADY_REGISTERED_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_REFRESH_TOKEN_MESSAGE,
  PASSWORD_SALT_ROUNDS,
  USERNAME_ALREADY_REGISTERED_MESSAGE,
} from './constants';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const hashMock = bcrypt.hash as jest.Mock;
const compareMock = bcrypt.compare as jest.Mock;

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  username: 'alice',
  email: 'alice@example.com',
  password: 'hashed-password',
  role: Role.USER,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByUsername' | 'findByEmail' | 'findById' | 'create'>
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
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    tokenService = {
      issueTokenPair: jest.fn(),
      verifyAndConsumeRefreshToken: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllSessions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    const dto = {
      username: 'alice',
      password: 'plain-password',
      confirmPassword: 'plain-password',
      email: 'alice@example.com',
    };

    it('throws ConflictException when the username is already taken', async () => {
      usersService.findByUsername.mockResolvedValue(buildUser());

      await expect(service.register(dto)).rejects.toThrow(
        new ConflictException(USERNAME_ALREADY_REGISTERED_MESSAGE),
      );
      expect(usersService.findByEmail).not.toHaveBeenCalled();
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the email is already registered', async () => {
      usersService.findByUsername.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(buildUser());

      await expect(service.register(dto)).rejects.toThrow(
        new ConflictException(EMAIL_ALREADY_REGISTERED_MESSAGE),
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('does not check email uniqueness when no email is provided', async () => {
      usersService.findByUsername.mockResolvedValue(null);
      usersService.create.mockResolvedValue(buildUser({ email: null }));
      hashMock.mockResolvedValue('hashed-password');
      tokenService.issueTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      await service.register({ ...dto, email: undefined });

      expect(usersService.findByEmail).not.toHaveBeenCalled();
    });

    it('hashes the password, creates the user and issues a token pair on success', async () => {
      const createdUser = buildUser();
      usersService.findByUsername.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      hashMock.mockResolvedValue('hashed-password');
      usersService.create.mockResolvedValue(createdUser);
      tokenService.issueTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await service.register(dto);

      expect(hashMock).toHaveBeenCalledWith(dto.password, PASSWORD_SALT_ROUNDS);
      expect(usersService.create).toHaveBeenCalledWith({
        username: dto.username,
        password: 'hashed-password',
        email: dto.email,
      });
      expect(tokenService.issueTokenPair).toHaveBeenCalledWith({
        sub: createdUser.id,
        username: createdUser.username,
        role: createdUser.role,
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: createdUser.id, username: createdUser.username },
      });
    });

    it('does not leak the password or email in the returned user object', async () => {
      usersService.findByUsername.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      hashMock.mockResolvedValue('hashed-password');
      usersService.create.mockResolvedValue(buildUser());
      tokenService.issueTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await service.register(dto);

      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('email');
    });
  });

  describe('login', () => {
    const dto = { username: 'alice', password: 'plain-password' };

    it('throws UnauthorizedException when the user does not exist', async () => {
      usersService.findByUsername.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE),
      );
      expect(compareMock).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the user is inactive', async () => {
      usersService.findByUsername.mockResolvedValue(
        buildUser({ isActive: false }),
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

    it('issues a token pair on successful login', async () => {
      const user = buildUser();
      usersService.findByUsername.mockResolvedValue(user);
      compareMock.mockResolvedValue(true);
      tokenService.issueTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await service.login(dto);

      expect(tokenService.issueTokenPair).toHaveBeenCalledWith({
        sub: user.id,
        username: user.username,
        role: user.role,
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('logs in an ADMIN account through the same endpoint with its role in the payload', async () => {
      const admin = buildUser({ role: Role.ADMIN });
      usersService.findByUsername.mockResolvedValue(admin);
      compareMock.mockResolvedValue(true);
      tokenService.issueTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      await service.login(dto);

      expect(tokenService.issueTokenPair).toHaveBeenCalledWith({
        sub: admin.id,
        username: admin.username,
        role: Role.ADMIN,
      });
    });
  });

  describe('refresh', () => {
    const refreshToken = 'refresh-token';

    it('verifies and consumes the refresh token', async () => {
      tokenService.verifyAndConsumeRefreshToken.mockResolvedValue({
        sub: 'user-1',
      });
      usersService.findById.mockResolvedValue(buildUser());
      tokenService.issueTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'new-refresh-token',
      });

      await service.refresh(refreshToken);

      expect(tokenService.verifyAndConsumeRefreshToken).toHaveBeenCalledWith(
        refreshToken,
      );
    });

    it('propagates the error unchanged when the refresh token cannot be verified/consumed', async () => {
      const error = new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
      tokenService.verifyAndConsumeRefreshToken.mockRejectedValue(error);

      await expect(service.refresh(refreshToken)).rejects.toThrow(error);
      expect(usersService.findById).not.toHaveBeenCalled();
      expect(tokenService.revokeAllSessions).not.toHaveBeenCalled();
    });

    it('revokes all sessions before throwing when the user no longer exists', async () => {
      tokenService.verifyAndConsumeRefreshToken.mockResolvedValue({
        sub: 'user-1',
      });
      usersService.findById.mockResolvedValue(null);
      const callOrder: string[] = [];
      tokenService.revokeAllSessions.mockImplementation(() => {
        callOrder.push('revokeAllSessions');
        return Promise.resolve();
      });

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE),
      );
      callOrder.push('rejected');

      expect(tokenService.revokeAllSessions).toHaveBeenCalledWith('user-1');
      expect(callOrder).toEqual(['revokeAllSessions', 'rejected']);
    });

    it('revokes all sessions before throwing when the user is inactive', async () => {
      tokenService.verifyAndConsumeRefreshToken.mockResolvedValue({
        sub: 'user-1',
      });
      usersService.findById.mockResolvedValue(buildUser({ isActive: false }));

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE),
      );
      expect(tokenService.revokeAllSessions).toHaveBeenCalledWith('user-1');
    });

    it('issues a new token pair on success without revoking sessions', async () => {
      const user = buildUser();
      tokenService.verifyAndConsumeRefreshToken.mockResolvedValue({
        sub: user.id,
      });
      usersService.findById.mockResolvedValue(user);
      tokenService.issueTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await service.refresh(refreshToken);

      expect(tokenService.issueTokenPair).toHaveBeenCalledWith({
        sub: user.id,
        username: user.username,
        role: user.role,
      });
      expect(tokenService.revokeAllSessions).not.toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'new-refresh-token',
      });
    });
  });

  describe('logout', () => {
    it('revokes the session for the given refresh token', async () => {
      await service.logout('refresh-token');

      expect(tokenService.revokeSession).toHaveBeenCalledWith('refresh-token');
    });
  });
});
