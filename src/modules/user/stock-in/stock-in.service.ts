import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StockInRepository } from './stock-in.repository';
import { CreateStockInDto } from './dto/create-stock-in.dto';
import { UpdateStockInDto } from './dto/update-stock-in.dto';
import { SupplierService } from '../suppliers/suppliers.service';
import { ProductService } from '../product/product.service';
import {
  conflictField,
  generateCode,
  paginationMeta,
  paginationSkip,
} from '@/common/utils';
import { Prisma, StockInStatus } from '@/generated/prisma/client';
import { StockInItemInput } from './stock-in.types';
import { QueryStockInDto } from './dto/query-stock-in.dto';
import { PrismaService } from '@/modules/shared/database';
import { BatchService } from '../batch/batch.service';

@Injectable()
export class StockInService {
  constructor(
    private readonly stockInRepository: StockInRepository,
    private readonly supplierService: SupplierService,
    private readonly productService: ProductService,
    private readonly batchService: BatchService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateStockInDto) {
    await this.validateReferences(dto);

    const code = generateCode('PN');
    try {
      return await this.stockInRepository.create({
        code,
        supplierId: dto.supplierId,
        note: dto.note,
        items: this.buildItems(dto)!,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const field = conflictField(error);
        throw new ConflictException(`StockIn's ${field} already exists`);
      }
      throw error;
    }
  }

  async findAll(query: QueryStockInDto) {
    const { page = 1, limit = 10, search, supplierId, status } = query;
    const skip = paginationSkip(page, limit);

    const where: Prisma.StockInWhereInput = {};
    if (search) where.code = { contains: search, mode: 'insensitive' };
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.stockInRepository.findMany({ skip, take: limit, where }),
      this.stockInRepository.count(where),
    ]);

    return {
      stockIns: data,
      metadata: paginationMeta(total, page, limit),
    };
  }

  async findById(id: string) {
    const stockIn = await this.stockInRepository.findById(id);
    if (!stockIn) throw new NotFoundException(`StockIn with ${id} not found`);
    return stockIn;
  }

  async update(id: string, dto: UpdateStockInDto) {
    await this.getDraftOrThrow(id);
    await this.validateReferences(dto);

    return this.stockInRepository.replaceItems(id, {
      supplierId: dto.supplierId,
      note: dto.note,
      items: this.buildItems(dto),
    });
  }

  async remove(id: string) {
    await this.getDraftOrThrow(id);
    return this.stockInRepository.remove(id);
  }

  async confirm(id: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const stockIn = await this.stockInRepository.tryConfirm(id, tx);

        if (!stockIn) {
          const existing = await this.stockInRepository.findStatusById(id, tx);

          if (!existing)
            throw new NotFoundException(`StockIn with ${id} not found`);
          throw new BadRequestException('Only draft stock-in can be modified');
        }

        await this.batchService.createBatchesForStockIn(
          stockIn.items,
          new Date(),
          tx,
        );

        const quantityByProduct = new Map<string, number>();

        for (const item of stockIn.items) {
          const current = quantityByProduct.get(item.productId) ?? 0;
          quantityByProduct.set(
            item.productId,
            current + Number(item.quantity),
          );
        }

        for (const [productId, qty] of quantityByProduct) {
          await this.productService.incrementStock(productId, qty, tx);
        }

        return stockIn;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'StockIn already confirmed or batch code collision',
        );
      }
      throw error;
    }
  }

  private buildItems(
    dto: CreateStockInDto | UpdateStockInDto,
  ): StockInItemInput[] | undefined {
    if (!dto.items) return undefined;
    return dto.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      costPrice: item.costPrice,
      lineTotal: new Prisma.Decimal(item.quantity)
        .times(item.costPrice)
        .toNumber(),
      expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
    }));
  }

  private async validateReferences(dto: CreateStockInDto | UpdateStockInDto) {
    const checks: Promise<unknown>[] = [];
    if (dto.supplierId)
      checks.push(this.supplierService.findById(dto.supplierId));
    if (dto.items) {
      const uniqueProductIds = [
        ...new Set(dto.items.map((item) => item.productId)),
      ];
      checks.push(
        ...uniqueProductIds.map((id) => this.productService.findById(id)),
      );
    }
    await Promise.all(checks);
  }

  private async getDraftOrThrow(id: string) {
    const stockIn = await this.stockInRepository.findStatusById(id);
    if (!stockIn) throw new NotFoundException(`StockIn with ${id} not found`);

    if (stockIn.status !== StockInStatus.DRAFT)
      throw new BadRequestException('Only draft stock-in can be modified');

    return stockIn;
  }
}
