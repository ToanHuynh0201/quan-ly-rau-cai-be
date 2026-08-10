import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { Prisma, Product } from '@/generated/prisma/client';

const MOCK_DATE = new Date('2026-01-01T00:00:00.000Z');
const buildProduct = (overrides: Partial<Product> = {}): Product => ({
  id: '1',
  code: 'PROD01',
  name: 'Product 1',
  barcode: null,
  unit: 'KG',
  price: new Prisma.Decimal(10000),
  costPrice: new Prisma.Decimal(8000),
  stockQuantity: new Prisma.Decimal(0),
  minStock: null,
  description: null,
  imageUrl: null,
  isActive: true,
  categoryId: 'category-1',
  supplierId: 'supplier-1',
  createdAt: MOCK_DATE,
  updatedAt: MOCK_DATE,
  ...overrides,
});

describe('ProductController', () => {
  let controller: ProductController;
  let service: jest.Mocked<
    Pick<
      ProductService,
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
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: service }],
    }).compile();

    controller = module.get<ProductController>(ProductController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('delegates create to the service', async () => {
    const dto = {
      code: 'PROD01',
      name: 'Product 1',
      unit: 'KG' as const,
      price: 10000,
      costPrice: 8000,
      categoryId: 'category-1',
      supplierId: 'supplier-1',
    };
    service.create.mockResolvedValue(buildProduct());

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(buildProduct());
  });

  it('delegates findAll to the service', async () => {
    const query = { page: 1, limit: 10 };
    service.findAll.mockResolvedValue({
      products: [],
      metadata: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });

    await controller.findAll(query);

    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates findById to the service', async () => {
    service.findById.mockResolvedValue(buildProduct());

    await controller.findById('1');

    expect(service.findById).toHaveBeenCalledWith('1');
  });

  it('delegates update to the service', async () => {
    const dto = { name: 'New name' };
    service.update.mockResolvedValue(buildProduct());

    await controller.update('1', dto);

    expect(service.update).toHaveBeenCalledWith('1', dto);
  });

  it('delegates remove to the service', async () => {
    service.remove.mockResolvedValue(buildProduct());

    await controller.remove('1');

    expect(service.remove).toHaveBeenCalledWith('1');
  });
});
