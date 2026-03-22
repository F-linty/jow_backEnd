import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AcessGuard } from '@common';
import { GraphService } from './graph.service';

@UseGuards(AcessGuard)
@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get('materials')
  async listMaterials(
    @Query('keyword') keyword?: string,
    @Query('productTypeId') productTypeId?: string,
    @Query('materialCategoryId') materialCategoryId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.graphService.listMaterials({
      keyword,
      productTypeId,
      materialCategoryId,
      page,
      pageSize,
    });
    return { code: 200, message: '查询成功', data };
  }

  @Post('materials')
  async createMaterial(@Body() body) {
    const data = await this.graphService.createMaterial(body);
    return { code: 200, message: '创建成功', data: [data] };
  }

  @Put('materials/:id')
  async updateMaterial(@Param('id', ParseIntPipe) id: number, @Body() body) {
    const data = await this.graphService.updateMaterial(id, body);
    return { code: 200, message: '更新成功', data: [data] };
  }

  @Get('non-materials')
  async listNonMaterials(
    @Query('keyword') keyword?: string,
    @Query('orgId') orgId?: string,
    @Query('adopted') adopted?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.graphService.listNonMaterials({
      keyword,
      orgId,
      adopted,
      page,
      pageSize,
    });
    return { code: 200, message: '查询成功', data };
  }

  @Put('non-materials/:id/adopted')
  async updateNonMaterialAdopted(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { adopted?: boolean | string },
  ) {
    const adopted =
      body?.adopted === true ||
      body?.adopted === 'true' ||
      body?.adopted === '1';
    const data = await this.graphService.updateNonMaterialAdopted(id, adopted);
    return { code: 200, message: '更新成功', data: [data] };
  }

  @Post('non-materials/:id/adopted')
  async updateNonMaterialAdoptedByPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { adopted?: boolean | string },
  ) {
    const adopted =
      body?.adopted === true ||
      body?.adopted === 'true' ||
      body?.adopted === '1';
    const data = await this.graphService.updateNonMaterialAdopted(id, adopted);
    return { code: 200, message: '更新成功', data: [data] };
  }
}

