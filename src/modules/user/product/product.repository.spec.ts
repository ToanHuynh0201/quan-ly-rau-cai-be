import { ProductRepository } from './product.repository';
import { PrismaService } from '@/modules/shared/database';
import { productListSelect } from './product.types';

describe('ProductRepository', () => {
  let repository: ProductRepository;
  let prisma: {
    product: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      product: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    repository = new ProductRepository(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('creates a product with the given dto', async () => {
      const dto = {
        code: 'PROD01',
        name: 'Product 1',
        unit: 'KG' as const,
        price: 10000,
        costPrice: 8000,
        categoryId: 'category-1',
        supplierId: 'supplier-1',
      };
      prisma.product.create.mockResolvedValue({ id: '1', ...dto });

      const result = await repository.create(dto);

      expect(prisma.product.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('findById', () => {
    it('queries by id restricted to active products', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: '1' });

      const result = await repository.findById('1');

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: '1', isActive: true },
      });
      expect(result).toEqual({ id: '1' });
    });

    it('returns null when not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      const result = await repository.findById('missing');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('passes select/where/skip/take/orderBy through to prisma', async () => {
      const where = { isActive: true };
      prisma.product.findMany.mockResolvedValue([]);

      await repository.findMany({ skip: 0, take: 10, where });

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        select: productListSelect,
        where,
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns the list from prisma', async () => {
      const list = [{ id: '1', code: 'PROD01' }];
      prisma.product.findMany.mockResolvedValue(list);

      const result = await repository.findMany({});

      expect(result).toEqual(list);
    });
  });

  describe('count', () => {
    it('counts with the given where clause', async () => {
      const where = { isActive: true };
      prisma.product.count.mockResolvedValue(3);

      const result = await repository.count(where);

      expect(prisma.product.count).toHaveBeenCalledWith({ where });
      expect(result).toBe(3);
    });
  });

  describe('update', () => {
    it('updates an active product by id', async () => {
      const data = { name: 'New name' };
      prisma.product.update.mockResolvedValue({ id: '1', ...data });

      const result = await repository.update('1', data);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: '1', isActive: true },
        data,
      });
      expect(result).toEqual({ id: '1', ...data });
    });
  });

  describe('softDelete', () => {
    it('sets isActive to false', async () => {
      prisma.product.update.mockResolvedValue({ id: '1', isActive: false });

      const result = await repository.softDelete('1');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
      expect(result).toEqual({ id: '1', isActive: false });
    });
  });
});
