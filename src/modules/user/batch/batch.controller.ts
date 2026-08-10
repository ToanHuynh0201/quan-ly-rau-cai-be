import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BatchService } from './batch.service';
import { QueryBatchDto } from './query-batch.dto';
import { JwtAuthGuard } from '@/modules/shared/auth/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/generated/prisma/enums';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('batch')
@UseGuards(JwtAuthGuard)
@Roles(Role.USER)
@Controller('batches')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Get()
  @ApiOperation({ summary: 'List batches with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Batches retrieved successfully' })
  findAll(@Query() query: QueryBatchDto) {
    return this.batchService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get batch by id' })
  @ApiResponse({ status: 200, description: 'Batch found' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  findById(@Param('id') id: string) {
    return this.batchService.findById(id);
  }
}
