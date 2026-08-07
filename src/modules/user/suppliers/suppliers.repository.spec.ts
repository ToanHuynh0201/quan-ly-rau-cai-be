import { SuppliersRepository } from './suppliers.repository';
import { PrismaService } from '@/modules/shared/database';
import { supplierListSelect } from './suppliers.type';

describe('SuppliersRepository', () => {
  let repository: SuppliersRepository;
  let prisma: {
    supplier: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      supplier: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    repository = new SuppliersRepository(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('creates a supplier with the given dto', async () => {
      const dto = { code: 'SUP01', name: 'Supplier 1', phone: '0901234567' };
      prisma.supplier.create.mockResolvedValue({ id: '1', ...dto });

      const result = await repository.create(dto);

      expect(prisma.supplier.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('findById', () => {
    it('queries by id restricted to active suppliers', async () => {
      prisma.supplier.findFirst.mockResolvedValue({ id: '1' });

      const result = await repository.findById('1');

      expect(prisma.supplier.findFirst).toHaveBeenCalledWith({
        where: { id: '1', isActive: true },
      });
      expect(result).toEqual({ id: '1' });
    });

    it('returns null when not found', async () => {
      prisma.supplier.findFirst.mockResolvedValue(null);

      const result = await repository.findById('missing');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('passes select/where/skip/take/orderBy through to prisma', async () => {
      const where = { isActive: true };
      prisma.supplier.findMany.mockResolvedValue([]);

      await repository.findMany({ skip: 0, take: 10, where });

      expect(prisma.supplier.findMany).toHaveBeenCalledWith({
        select: supplierListSelect,
        where,
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns the list from prisma', async () => {
      const list = [{ id: '1', code: 'SUP01' }];
      prisma.supplier.findMany.mockResolvedValue(list);

      const result = await repository.findMany({});

      expect(result).toEqual(list);
    });
  });

  describe('count', () => {
    it('counts with the given where clause', async () => {
      const where = { isActive: true };
      prisma.supplier.count.mockResolvedValue(3);

      const result = await repository.count(where);

      expect(prisma.supplier.count).toHaveBeenCalledWith({ where });
      expect(result).toBe(3);
    });
  });

  describe('update', () => {
    it('updates an active supplier by id', async () => {
      const data = { name: 'New name' };
      prisma.supplier.update.mockResolvedValue({ id: '1', ...data });

      const result = await repository.update('1', data);

      expect(prisma.supplier.update).toHaveBeenCalledWith({
        where: { id: '1', isActive: true },
        data,
      });
      expect(result).toEqual({ id: '1', ...data });
    });
  });

  describe('softDelete', () => {
    it('sets isActive to false', async () => {
      prisma.supplier.update.mockResolvedValue({ id: '1', isActive: false });

      const result = await repository.softDelete('1');

      expect(prisma.supplier.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
      expect(result).toEqual({ id: '1', isActive: false });
    });
  });
});
