import { Controller, Get } from '@nestjs/common';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('overview')
  async getOverview() {
    const data = await this.homeService.getOverview();

    return {
      code: 200,
      message: '查询成功',
      data,
    };
  }
}

