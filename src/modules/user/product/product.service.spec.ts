import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import { CategoryService } from '../category/category.service';
import { SupplierService } from '../suppliers/suppliers.service';
import { Prisma, Product } from '@/generated/prisma/client';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Prisma error', {
    code,
    clientVersion: '5.0.0',
  });

const buildProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-1',
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
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('ProductService', () => {
  let service: ProductService;
  let repository: jest.Mocked<
    Pick<
      ProductRepository,
      'create' | 'findMany' | 'count' | 'findById' | 'update' | 'softDelete'
    >
  >;
  let categoryService: jest.Mocked<Pick<CategoryService, 'findById'>>;
  let supplierService: jest.Mocked<Pick<SupplierService, 'findById'>>;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    categoryService = { findById: jest.fn() };
    supplierService = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: ProductRepository, useValue: repository },
        { provide: CategoryService, useValue: categoryService },
        { provide: SupplierService, useValue: supplierService },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    const dto = {
      code: 'PROD01',
      name: 'Product 1',
      unit: 'KG' as const,
      price: 10000,
      costPrice: 8000,
      categoryId: 'category-1',
      supplierId: 'supplier-1',
    };

    it('returns the created product when category and supplier exist', async () => {
      categoryService.findById.mockResolvedValue({} as never);
      supplierService.findById.mockResolvedValue({} as never);
      const created = buildProduct();
      repository.create.mockResolvedValue(created);

      const result = await service.create({ ...dto });

      expect(result).toEqual(created);
    });

    it('throws NotFoundException when category does not exist', async () => {
      categoryService.findById.mockRejectedValue(
        new NotFoundException('Category with category-1 not found'),
      );

      await expect(service.create({ ...dto })).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when supplier does not exist', async () => {
      categoryService.findById.mockResolvedValue({} as never);
      supplierService.findById.mockRejectedValue(
        new NotFoundException('Supplier with supplier-1 not found'),
      );

      await expect(service.create({ ...dto })).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when code or barcode already exists (P2002)', async () => {
      categoryService.findById.mockResolvedValue({} as never);
      supplierService.findById.mockResolvedValue({} as never);
      repository.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create({ ...dto })).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows unrelated errors', async () => {
      categoryService.findById.mockResolvedValue({} as never);
      supplierService.findById.mockResolvedValue({} as never);
      const error = new Error('unexpected');
      repository.create.mockRejectedValue(error);

      await expect(service.create({ ...dto })).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    it('only queries active products when no filters are given', async () => {
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

      await service.findAll({ page: 1, limit: 10, search: 'rau' });

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            OR: expect.any(Array) as unknown,
          }) as unknown,
        }),
      );
    });

    it('filters by categoryId and supplierId when given', async () => {
      repository.findMany.mockResolvedValue([]);
      repository.count.mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 10,
        categoryId: 'category-1',
        supplierId: 'supplier-1',
      });

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'category-1',
            supplierId: 'supplier-1',
          }) as unknown,
        }),
      );
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when product does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the product when found', async () => {
      const product = buildProduct();
      repository.findById.mockResolvedValue(product);

      const result = await service.findById(product.id);

      expect(result).toEqual(product);
    });
  });

  describe('update', () => {
    const dto = { name: 'New name' };

    it('throws NotFoundException when new category does not exist', async () => {
      categoryService.findById.mockRejectedValue(
        new NotFoundException('Category with missing not found'),
      );

      await expect(
        service.update('product-1', { categoryId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when new supplier does not exist', async () => {
      supplierService.findById.mockRejectedValue(
        new NotFoundException('Supplier with missing not found'),
      );

      await expect(
        service.update('product-1', { supplierId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('returns the updated product on success', async () => {
      const product = buildProduct();
      repository.update.mockResolvedValue({ ...product, ...dto });

      const result = await service.update(product.id, dto);

      expect(result).toEqual({ ...product, ...dto });
    });

    it('throws ConflictException when new code or barcode already exists (P2002)', async () => {
      repository.update.mockRejectedValue(prismaError('P2002'));

      await expect(service.update('product-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException when product got deleted concurrently (P2025)', async () => {
      repository.update.mockRejectedValue(prismaError('P2025'));

      await expect(service.update('product-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when product does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('soft-deletes the product when it exists', async () => {
      const product = buildProduct();
      repository.findById.mockResolvedValue(product);
      repository.softDelete.mockResolvedValue({
        ...product,
        isActive: false,
      });

      await service.remove(product.id);

      expect(repository.softDelete).toHaveBeenCalledWith(product.id);
    });
  });
});
