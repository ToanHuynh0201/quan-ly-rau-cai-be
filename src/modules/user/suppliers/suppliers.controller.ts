import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SupplierService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '@/modules/shared/auth/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/generated/prisma/enums';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('suppliers')
@UseGuards(JwtAuthGuard)
@Roles(Role.USER)
@Controller('suppliers')
export class SupplierController {
  constructor(private readonly suppliersService: SupplierService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Supplier created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Supplier code already exists',
  })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List suppliers with pagination and search' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Suppliers retrieved successfully',
  })
  findAll(@Query() query: QuerySupplierDto) {
    return this.suppliersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by id' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Supplier found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Supplier not found',
  })
  findById(@Param('id') id: string) {
    return this.suppliersService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier by id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Supplier not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Supplier code already exists',
  })
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete supplier by id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Supplier not found',
  })
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
