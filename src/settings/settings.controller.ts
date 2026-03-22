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
import { AcessGuard, SystemAdminGuard } from '@common';
import { SettingsService } from './settings.service';

@UseGuards(AcessGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('org-controls')
  getOrgControls(
    @Query('fromOrgId') fromOrgId?: string,
    @Query('toOrgId') toOrgId?: string,
  ) {
    return this.settingsService
      .getOrgControls({ fromOrgId, toOrgId })
      .then((data) => ({ code: 200, message: '查询成功', data }));
  }

  @Post('org-controls')
  createOrgControl(@Body() body) {
    return this.settingsService.createOrgControl(body).then((data) => ({
      code: 200,
      message: '创建成功',
      data: [data],
    }));
  }

  @Put('org-controls/:id')
  updateOrgControl(@Param('id', ParseIntPipe) id: number, @Body() body) {
    return this.settingsService.updateOrgControl(id, body).then((data) => ({
      code: 200,
      message: '更新成功',
      data: [data],
    }));
  }

  @UseGuards(SystemAdminGuard)
  @Get('users')
  getUsers(@Query('account') account?: string, @Query('orgId') orgId?: string) {
    return this.settingsService
      .getUsers({ account, orgId })
      .then((data) => ({ code: 200, message: '查询成功', data }));
  }

  @UseGuards(SystemAdminGuard)
  @Post('users')
  createUser(@Body() body) {
    return this.settingsService.createUser(body).then((data) => ({
      code: 200,
      message: '创建成功',
      data: [data],
    }));
  }

  @UseGuards(SystemAdminGuard)
  @Put('users/:id')
  updateUser(@Param('id', ParseIntPipe) id: number, @Body() body) {
    return this.settingsService.updateUser(id, body).then((data) => ({
      code: 200,
      message: '更新成功',
      data: [data],
    }));
  }

  @UseGuards(SystemAdminGuard)
  @Delete('users/:id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.deleteUser(id).then(() => ({
      code: 200,
      message: '删除成功',
      data: [],
    }));
  }
}

