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
import { StockInService } from './stock-in.service';
import { CreateStockInDto } from './dto/create-stock-in.dto';
import { UpdateStockInDto } from './dto/update-stock-in.dto';
import { QueryStockInDto } from './dto/query-stock-in.dto';
import { JwtAuthGuard } from '@/modules/shared/auth/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/generated/prisma/enums';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('stock-in')
@UseGuards(JwtAuthGuard)
@Roles(Role.USER)
@Controller('stock-ins')
export class StockInController {
  constructor(private readonly stockInService: StockInService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a draft stock-in receipt' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Draft created' })
  create(@Body() dto: CreateStockInDto) {
    return this.stockInService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List stock-in receipts with pagination' })
  findAll(@Query() query: QueryStockInDto) {
    return this.stockInService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock-in receipt by id' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not found' })
  findById(@Param('id') id: string) {
    return this.stockInService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft stock-in receipt' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Not a draft anymore',
  })
  update(@Param('id') id: string, @Body() dto: UpdateStockInDto) {
    return this.stockInService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft stock-in receipt' })
  remove(@Param('id') id: string) {
    return this.stockInService.remove(id);
  }

  @Post(':id/confirm')
  @ApiOperation({
    summary: 'Confirm stock-in: create batches, movements, update stock',
  })
  confirm(@Param('id') id: string) {
    return this.stockInService.confirm(id);
  }
}
