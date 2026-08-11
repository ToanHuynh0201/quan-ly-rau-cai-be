import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { StockInService } from './stock-in.service';
import { StockInRepository } from './stock-in.repository';
import { SupplierService } from '../suppliers/suppliers.service';
import { ProductService } from '../product/product.service';
import { BatchService } from '../batch/batch.service';
import { PrismaService } from '@/modules/shared/database';
import { Prisma, StockIn, StockInStatus } from '@/generated/prisma/client';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Prisma error', {
    code,
    clientVersion: '5.0.0',
  });

const buildStockIn = (overrides: Partial<StockIn> = {}): StockIn => ({
  id: 'stock-in-1',
  code: 'PN-20260101-0001',
  status: StockInStatus.DRAFT,
  note: null,
  confirmedAt: null,
  supplierId: 'supplier-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('StockInService', () => {
  let service: StockInService;
  let repository: jest.Mocked<
    Pick<
      StockInRepository,
      | 'create'
      | 'findMany'
      | 'count'
      | 'findById'
      | 'findStatusById'
      | 'replaceItems'
      | 'remove'
      | 'tryConfirm'
    >
  >;
  let supplierService: jest.Mocked<Pick<SupplierService, 'findById'>>;
  let productService: jest.Mocked<
    Pick<ProductService, 'findById' | 'incrementStock'>
  >;
  let batchService: jest.Mocked<Pick<BatchService, 'createBatchesForStockIn'>>;
  let prisma: jest.Mocked<Pick<PrismaService, '$transaction'>>;

  // Service methods only ever pass `tx` through to mocked collaborators in
  // these tests, so an opaque token is enough — no real transaction client
  // behaviour is exercised.
  const tx = {} as Prisma.TransactionClient;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findStatusById: jest.fn(),
      replaceItems: jest.fn(),
      remove: jest.fn(),
      tryConfirm: jest.fn(),
    };
    supplierService = { findById: jest.fn() };
    productService = { findById: jest.fn(), incrementStock: jest.fn() };
    batchService = { createBatchesForStockIn: jest.fn() };
    prisma = {
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)),
    } as never;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockInService,
        { provide: StockInRepository, useValue: repository },
        { provide: SupplierService, useValue: supplierService },
        { provide: ProductService, useValue: productService },
        { provide: BatchService, useValue: batchService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<StockInService>(StockInService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('confirm', () => {
    const items = [
      {
        id: 'item-1',
        productId: 'product-1',
        quantity: new Prisma.Decimal(5),
        costPrice: new Prisma.Decimal(1000),
        expiryDate: null,
      },
      {
        id: 'item-2',
        productId: 'product-1',
        quantity: new Prisma.Decimal(3),
        costPrice: new Prisma.Decimal(1000),
        expiryDate: null,
      },
    ];

    it('creates batches and increments stock per product inside the same transaction', async () => {
      const stockIn = { ...buildStockIn(), items };
      repository.tryConfirm.mockResolvedValue(stockIn as never);

      const result = await service.confirm(stockIn.id);

      expect(repository.tryConfirm).toHaveBeenCalledWith(stockIn.id, tx);
      expect(batchService.createBatchesForStockIn).toHaveBeenCalledWith(
        items,
        expect.any(Date),
        tx,
      );
      // quantity 5 + 3 for the same productId must collapse into one increment call
      expect(productService.incrementStock).toHaveBeenCalledTimes(1);
      expect(productService.incrementStock).toHaveBeenCalledWith(
        'product-1',
        8,
        tx,
      );
      expect(result).toEqual(stockIn);
    });

    it('throws BadRequestException on a second confirm of an already-confirmed stock-in', async () => {
      // tryConfirm's WHERE status: DRAFT matched 0 rows -> null
      repository.tryConfirm.mockResolvedValue(null);
      repository.findStatusById.mockResolvedValue(
        buildStockIn({ status: StockInStatus.CONFIRMED }),
      );

      await expect(service.confirm('stock-in-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(batchService.createBatchesForStockIn).not.toHaveBeenCalled();
      expect(productService.incrementStock).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the stock-in does not exist', async () => {
      repository.tryConfirm.mockResolvedValue(null);
      repository.findStatusById.mockResolvedValue(null);

      await expect(service.confirm('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when batch code collides (P2002)', async () => {
      repository.tryConfirm.mockResolvedValue({
        ...buildStockIn(),
        items: [],
      } as never);
      batchService.createBatchesForStockIn.mockRejectedValue(
        prismaError('P2002'),
      );

      await expect(service.confirm('stock-in-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('throws BadRequestException when stock-in is not draft', async () => {
      repository.findStatusById.mockResolvedValue(
        buildStockIn({ status: StockInStatus.CONFIRMED }),
      );

      await expect(service.update('stock-in-1', { note: 'x' })).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.replaceItems).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when stock-in does not exist', async () => {
      repository.findStatusById.mockResolvedValue(null);

      await expect(service.update('missing', { note: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('throws BadRequestException when stock-in is not draft', async () => {
      repository.findStatusById.mockResolvedValue(
        buildStockIn({ status: StockInStatus.CONFIRMED }),
      );

      await expect(service.remove('stock-in-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('removes the draft stock-in when it exists', async () => {
      const stockIn = buildStockIn();
      repository.findStatusById.mockResolvedValue(stockIn);
      repository.remove.mockResolvedValue(stockIn);

      await service.remove(stockIn.id);

      expect(repository.remove).toHaveBeenCalledWith(stockIn.id);
    });
  });
});
