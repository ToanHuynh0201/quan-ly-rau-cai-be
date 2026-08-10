import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CategoryService } from './category.service';
import { CategoryRepository } from './category.repository';
import { Category, Prisma } from '@/generated/prisma/client';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Prisma error', {
    code,
    clientVersion: '5.0.0',
  });

const buildCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'category-1',
  code: 'CAT01',
  name: 'Category 1',
  slug: 'category-1',
  description: null,
  icon: null,
  isActive: true,
  parentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('CategoryService', () => {
  let service: CategoryService;
  let repository: jest.Mocked<
    Pick<
      CategoryRepository,
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
        CategoryService,
        { provide: CategoryRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    const dto = { code: 'CAT01', name: 'Category 1' };

    it('returns the created category on success', async () => {
      const created = buildCategory();
      repository.create.mockResolvedValue(created);

      const result = await service.create({ ...dto });

      expect(result).toEqual(created);
    });

    it('throws NotFoundException when parent category does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.create({ ...dto, parentId: 'missing-parent' }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates when parent category exists', async () => {
      repository.findById.mockResolvedValue(buildCategory({ id: 'parent-1' }));
      repository.create.mockResolvedValue(
        buildCategory({ parentId: 'parent-1' }),
      );

      const result = await service.create({ ...dto, parentId: 'parent-1' });

      expect(result.parentId).toBe('parent-1');
    });

    it('throws ConflictException when code or slug already exists (P2002)', async () => {
      repository.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create({ ...dto })).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows unrelated errors', async () => {
      const error = new Error('unexpected');
      repository.create.mockRejectedValue(error);

      await expect(service.create({ ...dto })).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    it('only queries active categories when no search term is given', async () => {
      repository.findMany.mockResolvedValue([]);
      repository.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 });

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('adds an OR filter across name/code when search is given', async () => {
      repository.findMany.mockResolvedValue([]);
      repository.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10, search: 'cat' });

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
    it('throws NotFoundException when category does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the category when found', async () => {
      const category = buildCategory();
      repository.findById.mockResolvedValue(category);

      const result = await service.findById(category.id);

      expect(result).toEqual(category);
    });
  });

  describe('update', () => {
    const dto = { name: 'New name' };

    it('throws BadRequestException when category is set as its own parent', async () => {
      await expect(
        service.update('category-1', { parentId: 'category-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when parent category does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update('category-1', { parentId: 'missing-parent' }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('returns the updated category on success', async () => {
      const category = buildCategory();
      repository.update.mockResolvedValue({ ...category, ...dto });

      const result = await service.update(category.id, dto);

      expect(result).toEqual({ ...category, ...dto });
    });

    it('throws ConflictException when new code or slug already exists (P2002)', async () => {
      repository.update.mockRejectedValue(prismaError('P2002'));

      await expect(service.update('category-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException when category got deleted concurrently (P2025)', async () => {
      repository.update.mockRejectedValue(prismaError('P2025'));

      await expect(service.update('category-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when category does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('soft-deletes the category when it exists', async () => {
      const category = buildCategory();
      repository.findById.mockResolvedValue(category);
      repository.softDelete.mockResolvedValue({
        ...category,
        isActive: false,
      });

      await service.remove(category.id);

      expect(repository.softDelete).toHaveBeenCalledWith(category.id);
    });
  });
});
