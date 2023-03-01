import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('user')
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @ApiSecurity('access-key')
  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':id')
  public async getAllUsers(
    @Req() req,
    @Param('id') id: string,
  ): Promise<User[]> {
    return this.usersService.getAllUsers(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiSecurity('access-key')
  @UseInterceptors(ClassSerializerInterceptor)
  @Put(':id')
  public async updateBoss(
    @Req() req,
    @Param('id') id: string,
    @Body()
    {
      childId,
      newBossId,
    }: {
      childId: string;
      newBossId: string;
    },
  ): Promise<User> {
    return this.usersService.updateBoss(id, childId, newBossId);
  }
}
