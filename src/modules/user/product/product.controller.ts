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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '@/modules/shared/auth/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/generated/prisma/enums';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('product')
@UseGuards(JwtAuthGuard)
@Roles(Role.USER)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product created successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category or supplier not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Product code or barcode already exists',
  })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List products with pagination and search' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products retrieved successfully',
  })
  findAll(@Query() query: QueryProductDto) {
    return this.productService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by id' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Product found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  findById(@Param('id') id: string) {
    return this.productService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product by id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product, category or supplier not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Product code or barcode already exists',
  })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete product by id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
