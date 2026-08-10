import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { SupplierService } from './suppliers.service';
import { SuppliersRepository } from './suppliers.repository';
import { Prisma, Supplier } from '@/generated/prisma/client';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Prisma error', {
    code,
    clientVersion: '5.0.0',
  });

const buildSupplier = (overrides: Partial<Supplier> = {}): Supplier => ({
  id: 'supplier-1',
  code: 'SUP01',
  name: 'Supplier 1',
  contactName: null,
  phone: '0901234567',
  email: null,
  address: null,
  taxCode: null,
  note: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('SupplierService', () => {
  let service: SupplierService;
  let repository: jest.Mocked<
    Pick<
      SuppliersRepository,
      'create' | 'findMany' | 'count' | 'findById' | 'update' | 'softDelete'
    >
  >;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        { provide: SuppliersRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<SupplierService>(SupplierService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    const dto = { code: 'SUP01', name: 'Supplier 1', phone: '0901234567' };

    it('returns the created supplier on success', async () => {
      const created = buildSupplier();
      repository.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(result).toEqual(created);
    });

    it('throws ConflictException when code already exists (P2002)', async () => {
      repository.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('rethrows unrelated errors', async () => {
      const error = new Error('unexpected');
      repository.create.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    it('only queries active suppliers when no search term is given', async () => {
      repository.findMany.mockResolvedValue([]);
      repository.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 });

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('adds an OR filter across name/code/phone when search is given', async () => {
      repository.findMany.mockResolvedValue([]);
      repository.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10, search: 'sup' });

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            OR: expect.any(Array) as unknown,
          }) as unknown,
        }),
      );
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when supplier does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the supplier when found', async () => {
      const supplier = buildSupplier();
      repository.findById.mockResolvedValue(supplier);

      const result = await service.findById(supplier.id);

      expect(result).toEqual(supplier);
    });
  });

  describe('update', () => {
    const dto = { code: 'SUP02' };

    it('does not perform an extra lookup before updating', async () => {
      repository.update.mockResolvedValue(buildSupplier());

      await service.update('supplier-1', dto);

      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('returns the updated supplier on success', async () => {
      const supplier = buildSupplier();
      repository.findById.mockResolvedValue(supplier);
      repository.update.mockResolvedValue({ ...supplier, ...dto });

      const result = await service.update(supplier.id, dto);

      expect(result).toEqual({ ...supplier, ...dto });
    });

    it('throws ConflictException when new code already exists (P2002)', async () => {
      repository.findById.mockResolvedValue(buildSupplier());
      repository.update.mockRejectedValue(prismaError('P2002'));

      await expect(service.update('supplier-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException when supplier got deleted concurrently (P2025)', async () => {
      repository.findById.mockResolvedValue(buildSupplier());
      repository.update.mockRejectedValue(prismaError('P2025'));

      await expect(service.update('supplier-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when supplier does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('soft-deletes the supplier when it exists', async () => {
      const supplier = buildSupplier();
      repository.findById.mockResolvedValue(supplier);
      repository.softDelete.mockResolvedValue({ ...supplier, isActive: false });

      await service.remove(supplier.id);

      expect(repository.softDelete).toHaveBeenCalledWith(supplier.id);
    });
  });
});
