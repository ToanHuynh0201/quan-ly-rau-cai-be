import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<
    Pick<AuthService, 'register' | 'login' | 'refresh' | 'logout'>
  >;

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    it('delegates to authService.register with the dto and returns its result', async () => {
      const dto = {
        username: 'alice',
        password: 'plain-password',
        confirmPassword: 'plain-password',
        email: 'alice@example.com',
      };
      const result = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-1', username: 'alice', email: 'alice@example.com' },
      };
      authService.register.mockResolvedValue(result);

      await expect(controller.register(dto)).resolves.toEqual(result);
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('delegates to authService.login with the dto and returns its result', async () => {
      const dto = { username: 'alice', password: 'plain-password' };
      const result = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      authService.login.mockResolvedValue(result);

      await expect(controller.login(dto)).resolves.toEqual(result);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('delegates to authService.refresh with only the refresh token string', async () => {
      const dto = { refreshToken: 'refresh-token' };
      const result = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      authService.refresh.mockResolvedValue(result);

      await expect(controller.refresh(dto)).resolves.toEqual(result);
      expect(authService.refresh).toHaveBeenCalledWith('refresh-token');
    });
  });

  describe('logout', () => {
    it('delegates to authService.logout with only the refresh token string', async () => {
      const dto = { refreshToken: 'refresh-token' };
      authService.logout.mockResolvedValue(undefined);

      await controller.logout(dto);

      expect(authService.logout).toHaveBeenCalledWith('refresh-token');
    });
  });
});
