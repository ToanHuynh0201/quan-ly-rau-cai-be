import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getInfo', () => {
    it('should return app info', () => {
      const result = appController.getInfo();
      expect(result).toEqual({
        name: 'Quản lý rau củ API',
        version: '1.0',
        description: 'API backend cho hệ thống quản lý rau củ',
      });
    });
  });
});
