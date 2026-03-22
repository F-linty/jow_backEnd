import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AcessGuard } from '@common';
import { ProductTypesService } from './product-types.service';

@UseGuards(AcessGuard)
@Controller('product-types')
export class ProductTypesController {
  constructor(private readonly productTypesService: ProductTypesService) {}

  @Get()
  async list(@Query('keyword') keyword?: string, @Query('tree') tree?: string) {
    const data = await this.productTypesService.list({ keyword, tree });
    return {
      code: 200,
      message: '查询成功',
      data,
    };
  }

  @Post()
  async create(@Body() body) {
    const data = await this.productTypesService.create(body);
    return {
      code: 200,
      message: '创建成功',
      data: [data],
    };
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body) {
    const data = await this.productTypesService.update(id, body);
    return {
      code: 200,
      message: '更新成功',
      data: [data],
    };
  }

  @Post(':id/disable')
  async disable(@Param('id', ParseIntPipe) id: number) {
    const data = await this.productTypesService.disable(id);
    return {
      code: 200,
      message: '停用成功',
      data: [data],
    };
  }

  @Post(':id/enable')
  async enable(@Param('id', ParseIntPipe) id: number) {
    const data = await this.productTypesService.enable(id);
    return {
      code: 200,
      message: '启用成功',
      data: [data],
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.productTypesService.remove(id);
    return {
      code: 200,
      message: '删除成功',
      data: [data],
    };
  }
}

