import { CategoryRepository } from './category.repository';
import { PrismaService } from '@/modules/shared/database';
import { categoryListSelect } from './category.types';

describe('CategoryRepository', () => {
  let repository: CategoryRepository;
  let prisma: {
    category: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      category: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    repository = new CategoryRepository(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('creates a category with the given dto', async () => {
      const dto = { code: 'CAT01', name: 'Category 1' };
      prisma.category.create.mockResolvedValue({ id: '1', ...dto });

      const result = await repository.create(dto);

      expect(prisma.category.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('findById', () => {
    it('queries by id restricted to active categories', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: '1' });

      const result = await repository.findById('1');

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: '1', isActive: true },
      });
      expect(result).toEqual({ id: '1' });
    });

    it('returns null when not found', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      const result = await repository.findById('missing');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('passes select/where/skip/take/orderBy through to prisma', async () => {
      const where = { isActive: true };
      prisma.category.findMany.mockResolvedValue([]);

      await repository.findMany({ skip: 0, take: 10, where });

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        select: categoryListSelect,
        where,
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns the list from prisma', async () => {
      const list = [{ id: '1', code: 'CAT01' }];
      prisma.category.findMany.mockResolvedValue(list);

      const result = await repository.findMany({});

      expect(result).toEqual(list);
    });
  });

  describe('count', () => {
    it('counts with the given where clause', async () => {
      const where = { isActive: true };
      prisma.category.count.mockResolvedValue(3);

      const result = await repository.count(where);

      expect(prisma.category.count).toHaveBeenCalledWith({ where });
      expect(result).toBe(3);
    });
  });

  describe('update', () => {
    it('updates an active category by id', async () => {
      const data = { name: 'New name' };
      prisma.category.update.mockResolvedValue({ id: '1', ...data });

      const result = await repository.update('1', data);

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: '1', isActive: true },
        data,
      });
      expect(result).toEqual({ id: '1', ...data });
    });
  });

  describe('softDelete', () => {
    it('sets isActive to false', async () => {
      prisma.category.update.mockResolvedValue({ id: '1', isActive: false });

      const result = await repository.softDelete('1');

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
      expect(result).toEqual({ id: '1', isActive: false });
    });
  });
});
