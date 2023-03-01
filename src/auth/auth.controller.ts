import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthService, RegistrationStatus } from './auth.service';
import { CreateUserDto, LoginUserDto } from '../users/user.dto';
import { FormatLogin } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<RegistrationStatus> {
    return await this.authService.register(createUserDto);
  }

  @Post('login')
  async login(
    @Body() loginUserDto: LoginUserDto,
  ): Promise<{ data: FormatLogin; expiresIn: string; Authorization: string }> {
    return await this.authService.login(loginUserDto);
  }
}
