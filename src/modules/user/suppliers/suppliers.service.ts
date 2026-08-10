import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SuppliersRepository } from './suppliers.repository';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { Prisma } from '@/generated/prisma/client';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(private readonly supplierRepository: SuppliersRepository) {}

  async create(dto: CreateSupplierDto) {
    try {
      return await this.supplierRepository.create(dto);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(`Supplier's code ${dto.code} has existed`);
      }

      throw error;
    }
  }

  async findAll(query: QuerySupplierDto) {
    const { page = 1, limit = 10, search } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.supplierRepository.findMany({ skip, take: limit, where }),
      this.supplierRepository.count(where),
    ]);

    return {
      suppliers: data,
      metadata: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const supplier = await this.supplierRepository.findById(id);

    if (!supplier) throw new NotFoundException(`Supplier with ${id} not found`);

    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    try {
      return await this.supplierRepository.update(id, dto);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(`Supplier's code ${dto.code} has existed`);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Supplier with ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findById(id);
    return this.supplierRepository.softDelete(id);
  }
}
