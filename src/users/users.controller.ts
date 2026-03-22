import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AcessGuard } from '../common';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  @HttpCode(200)
  create(@Body() user) {
    return this.usersService.create(user);
  }

  @UseGuards(AcessGuard)
  @Get()
  findOne(@Request() req) {
    const { userId } = req.user;
    return this.usersService.findOne(userId);
  }
}

