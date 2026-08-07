import { Test, TestingModule } from '@nestjs/testing';
import { SupplierController } from './suppliers.controller';
import { SupplierService } from './suppliers.service';
import { Supplier } from '@/generated/prisma/client';
const MOCK_DATE = new Date('2026-01-01T00:00:00.000Z');
const buildSupplier = (overrides: Partial<Supplier> = {}): Supplier => ({
  id: '1',
  code: 'SUP01',
  name: 'Supplier 1',
  contactName: null,
  phone: '0901234567',
  email: null,
  address: null,
  taxCode: null,
  note: null,
  isActive: true,
  createdAt: MOCK_DATE,
  updatedAt: MOCK_DATE,
  ...overrides,
});

describe('SupplierController', () => {
  let controller: SupplierController;
  let service: jest.Mocked<
    Pick<
      SupplierService,
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
      controllers: [SupplierController],
      providers: [{ provide: SupplierService, useValue: service }],
    }).compile();

    controller = module.get<SupplierController>(SupplierController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('delegates create to the service', async () => {
    const dto = { code: 'SUP01', name: 'Supplier 1', phone: '0901234567' };
    service.create.mockResolvedValue(buildSupplier());

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(buildSupplier());
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
    service.findById.mockResolvedValue(buildSupplier());

    await controller.findById('1');

    expect(service.findById).toHaveBeenCalledWith('1');
  });

  it('delegates update to the service', async () => {
    const dto = { name: 'New name' };
    service.update.mockResolvedValue(buildSupplier());

    await controller.update('1', dto);

    expect(service.update).toHaveBeenCalledWith('1', dto);
  });

  it('delegates remove to the service', async () => {
    service.remove.mockResolvedValue(buildSupplier());

    await controller.remove('1');

    expect(service.remove).toHaveBeenCalledWith('1');
  });
});
