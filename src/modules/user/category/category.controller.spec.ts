import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { Category } from '@/generated/prisma/client';

const MOCK_DATE = new Date('2026-01-01T00:00:00.000Z');
const buildCategory = (overrides: Partial<Category> = {}): Category => ({
  id: '1',
  code: 'CAT01',
  name: 'Category 1',
  slug: 'category-1',
  description: null,
  icon: null,
  isActive: true,
  parentId: null,
  createdAt: MOCK_DATE,
  updatedAt: MOCK_DATE,
  ...overrides,
});

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: jest.Mocked<
    Pick<
      CategoryService,
      'create' | 'findAll' | 'findById' | 'update' | 'remove'
    >
  >;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: service }],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('delegates create to the service', async () => {
    const dto = { code: 'CAT01', name: 'Category 1' };
    service.create.mockResolvedValue(buildCategory());

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(buildCategory());
  });

  it('delegates findAll to the service', async () => {
    const query = { page: 1, limit: 10 };
    service.findAll.mockResolvedValue({
      data: [],
      metadata: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });

    await controller.findAll(query);

    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates findById to the service', async () => {
    service.findById.mockResolvedValue(buildCategory());

    await controller.findById('1');

    expect(service.findById).toHaveBeenCalledWith('1');
  });

  it('delegates update to the service', async () => {
    const dto = { name: 'New name' };
    service.update.mockResolvedValue(buildCategory());

    await controller.update('1', dto);

    expect(service.update).toHaveBeenCalledWith('1', dto);
  });

  it('delegates remove to the service', async () => {
    service.remove.mockResolvedValue(buildCategory());

    await controller.remove('1');

    expect(service.remove).toHaveBeenCalledWith('1');
  });
});
