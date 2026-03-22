import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AcessGuard } from '@common';
import { PurchasesService } from './purchases.service';

@UseGuards(AcessGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post(':month/plans')
  createPlan(
    @Param('month') month: string,
    @Request() req,
    @Body() body,
  ) {
    return this.purchasesService
      .createPlan(month, Number(req.user.userId), body)
      .then((data) => ({
        code: 200,
        message: '提报成功',
        data: [data],
      }));
  }

  @Get(':month/plans')
  listPlans(
    @Param('month') month: string,
    @Request() req,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.purchasesService
      .listPlans(month, Number(req.user.userId), { page, pageSize, keyword })
      .then((data) => ({
        code: 200,
        message: '查询成功',
        data,
      }));
  }

  @Get(':month/plans/:id')
  getPlanDetail(
    @Param('month') month: string,
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.purchasesService
      .getPlanDetail(month, id, Number(req.user.userId))
      .then((data) => ({
        code: 200,
        message: '查询成功',
        data: [data],
      }));
  }

  @Post(':month/aggregate')
  runAggregate(@Param('month') month: string, @Body() body) {
    return this.purchasesService.runAggregate(month, body).then((data) => ({
      code: 200,
      message: '聚合完成',
      data: [data],
    }));
  }

  @Get(':month/aggregate')
  getAggregate(
    @Param('month') month: string,
    @Query('orgId') orgId?: string,
    @Query('aggregateId') aggregateId?: string,
    @Query('planId') planId?: string,
    @Query('lineType') lineType?: string,
  ) {
    return this.purchasesService.getAggregate(month, { orgId, aggregateId, planId, lineType }).then((data) => ({
      code: 200,
      message: '查询成功',
      data: [data],
    }));
  }

  @Get(':month/aggregate/history')
  listAggregateHistory(
    @Param('month') month: string,
    @Query('orgId') orgId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.purchasesService
      .listAggregateHistory(month, { orgId, page, pageSize })
      .then((data) => ({
        code: 200,
        message: '查询成功',
        data,
      }));
  }
}

