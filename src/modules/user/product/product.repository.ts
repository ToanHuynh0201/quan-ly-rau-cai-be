import { PrismaService } from '@/modules/shared/database';
import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { Prisma, Product } from '@/generated/prisma/client';
import { ProductListItem, productListSelect } from './product.types';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<Product> {
    return this.prisma.product.create({
      data: dto,
    });
  }

  async findById(id: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { id, isActive: true },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ProductWhereInput;
  }): Promise<ProductListItem[]> {
    const { skip, take, where } = params;

    return this.prisma.product.findMany({
      select: productListSelect,
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(where?: Prisma.ProductWhereInput): Promise<number> {
    return this.prisma.product.count({ where });
  }

  async update(id: string, data: UpdateProductDto): Promise<Product> {
    return this.prisma.product.update({
      where: { id, isActive: true },
      data,
    });
  }

  async softDelete(id: string): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
