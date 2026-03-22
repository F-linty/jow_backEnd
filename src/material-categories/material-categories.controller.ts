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
import { MaterialCategoriesService } from './material-categories.service';

@UseGuards(AcessGuard)
@Controller('material-categories')
export class MaterialCategoriesController {
  constructor(
    private readonly materialCategoriesService: MaterialCategoriesService,
  ) {}

  @Get()
  async list(@Query('keyword') keyword?: string, @Query('tree') tree?: string) {
    const data = await this.materialCategoriesService.list({ keyword, tree });
    return {
      code: 200,
      message: '查询成功',
      data,
    };
  }

  @Post()
  async create(@Body() body) {
    const data = await this.materialCategoriesService.create(body);
    return {
      code: 200,
      message: '创建成功',
      data: [data],
    };
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body) {
    const data = await this.materialCategoriesService.update(id, body);
    return {
      code: 200,
      message: '更新成功',
      data: [data],
    };
  }

  @Post(':id/disable')
  async disable(@Param('id', ParseIntPipe) id: number) {
    const data = await this.materialCategoriesService.disable(id);
    return {
      code: 200,
      message: '停用成功',
      data: [data],
    };
  }

  @Post(':id/enable')
  async enable(@Param('id', ParseIntPipe) id: number) {
    const data = await this.materialCategoriesService.enable(id);
    return {
      code: 200,
      message: '启用成功',
      data: [data],
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.materialCategoriesService.remove(id);
    return {
      code: 200,
      message: '删除成功',
      data: [data],
    };
  }
}

