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
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '@/modules/shared/auth/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/generated/prisma/enums';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('category')
@Controller('categories')
@UseGuards(JwtAuthGuard)
@Roles(Role.USER)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Parent category not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Category code or slug already exists',
  })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List categories with pagination and search' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories retrieved successfully',
  })
  findAll(@Query() query: QueryCategoryDto) {
    return this.categoryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  findById(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category by id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Category cannot be its own parent',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Category code or slug already exists',
  })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete category by id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
