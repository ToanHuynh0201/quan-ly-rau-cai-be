import { PrismaService } from '@/modules/shared/database';
import { Injectable } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { Prisma, Supplier } from '@/generated/prisma/client';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierListItem, supplierListSelect } from './suppliers.type';

@Injectable()
export class SuppliersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    return this.prisma.supplier.create({
      data: dto,
    });
  }

  async findById(id: string): Promise<Supplier | null> {
    return this.prisma.supplier.findFirst({
      where: { id, isActive: true },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.SupplierWhereInput;
  }): Promise<SupplierListItem[]> {
    const { skip, take, where } = params;

    return this.prisma.supplier.findMany({
      select: supplierListSelect,
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(where?: Prisma.SupplierWhereInput): Promise<number> {
    return this.prisma.supplier.count({
      where,
    });
  }

  async update(id: string, data: UpdateSupplierDto): Promise<Supplier> {
    return this.prisma.supplier.update({
      where: { id, isActive: true },
      data,
    });
  }

  async softDelete(id: string): Promise<Supplier> {
    return this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
