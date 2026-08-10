import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryRepository } from './category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { slugify } from './utils/slugify.util';
import { Prisma } from '@/generated/prisma/client';
import { conflictField } from '../../../common/utils/conflict.util';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async create(dto: CreateCategoryDto) {
    if (!dto.slug) dto.slug = slugify(dto.name);

    if (dto.parentId) {
      const parent = await this.categoryRepository.findById(dto.parentId);

      if (!parent)
        throw new NotFoundException(
          `Parent category with id ${dto.parentId} not found`,
        );
    }

    try {
      return await this.categoryRepository.create(dto);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const field = conflictField(error);
        throw new ConflictException(`Category's ${field} already exists`);
      }
      throw error;
    }
  }

  async findAll(query: QueryCategoryDto) {
    const { page = 1, limit = 10, search } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.categoryRepository.findMany({ skip, take: limit, where }),
      this.categoryRepository.count(where),
    ]);

    return {
      categories: data,
      metadata: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const category = await this.categoryRepository.findById(id);

    if (!category) throw new NotFoundException(`Category with ${id} not found`);

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    if (dto.parentId) {
      if (dto.parentId === id)
        throw new BadRequestException('Category cannot be its own parent');

      const parent = await this.categoryRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException(
          `Parent category with id ${dto.parentId} not found`,
        );
      }
      if (
        dto.parentId === id ||
        (await this.wouldCreateCycle(id, dto.parentId))
      ) {
        throw new BadRequestException(`Category cannot be its own ancestor`);
      }
    }

    try {
      return await this.categoryRepository.update(id, dto);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const field = conflictField(error);
        throw new ConflictException(`Category's ${field} already exists`);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Category with ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findById(id);
    return this.categoryRepository.softDelete(id);
  }

  private async wouldCreateCycle(
    id: string,
    newParentId: string,
  ): Promise<boolean> {
    let currentId: string | null = newParentId;
    const visitedSet = new Set<string>();

    while (currentId) {
      if (currentId === id) return true;
      if (visitedSet.has(currentId)) return false;
      visitedSet.add(currentId);

      const current = await this.categoryRepository.findById(currentId);
      currentId = current?.parentId ?? null;
    }

    return false;
  }
}
