import { PrismaService } from '@/modules/shared/database';
import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category, Prisma } from '@/generated/prisma/client';
import { CategoryListItem, categoryListSelect } from './category.types';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({
      data: dto as Prisma.CategoryUncheckedCreateInput,
    });
  }

  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id, isActive: true },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CategoryWhereInput;
  }): Promise<CategoryListItem[]> {
    const { skip, take, where } = params;

    return this.prisma.category.findMany({
      select: categoryListSelect,
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(where?: Prisma.CategoryWhereInput): Promise<number> {
    return this.prisma.category.count({
      where,
    });
  }

  async update(id: string, data: UpdateCategoryDto): Promise<Category> {
    return this.prisma.category.update({
      where: { id, isActive: true },
      data,
    });
  }

  async softDelete(id: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
