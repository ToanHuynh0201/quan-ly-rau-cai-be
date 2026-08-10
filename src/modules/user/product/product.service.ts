import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { CategoryService } from '../category/category.service';
import { SupplierService } from '../suppliers/suppliers.service';
import { CreateProductDto } from './dto/create-product.dto';
import { Prisma } from '@/generated/prisma/client';
import { conflictField } from '@/common/utils/conflict.util';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryService: CategoryService,
    private readonly supplierService: SupplierService,
  ) {}

  async create(dto: CreateProductDto) {
    await Promise.all([
      this.categoryService.findById(dto.categoryId),
      this.supplierService.findById(dto.supplierId),
    ]);

    try {
      return await this.productRepository.create(dto);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const field = conflictField(error);
        throw new ConflictException(`Product's ${field} already exists`);
      }
      throw error;
    }
  }

  async findAll(query: QueryProductDto) {
    const { page = 1, limit = 10, search, categoryId, supplierId } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (supplierId) where.supplierId = supplierId;

    const [data, total] = await Promise.all([
      this.productRepository.findMany({ skip, take: limit, where }),
      this.productRepository.count(where),
    ]);

    return {
      products: data,
      metadata: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) throw new NotFoundException(`Product with ${id} not found`);

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await Promise.all([
      dto.categoryId ? this.categoryService.findById(dto.categoryId) : null,
      dto.supplierId ? this.supplierService.findById(dto.supplierId) : null,
    ]);

    try {
      return await this.productRepository.update(id, dto);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const field = conflictField(error);
        throw new ConflictException(`Product's ${field} already exists`);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Product with ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findById(id);
    return this.productRepository.softDelete(id);
  }
}
