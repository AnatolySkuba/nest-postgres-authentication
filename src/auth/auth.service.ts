import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

import { FormatLogin, UsersService } from '../users/users.service';
import { CreateUserDto, LoginUserDto } from '../users/user.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  // use by the auth module to register a user in the database
  async register(userDto: CreateUserDto): Promise<RegistrationStatus> {
    const status: RegistrationStatus = {
      success: true,
      message: 'ACCOUNT_CREATE_SUCCESS',
    };

    try {
      status.data = await this.usersService.create(userDto);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: error.response,
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        },
      );
    }

    return status;
  }

  // use by the auth module to authenticate a user
  async login(
    loginUserDto: LoginUserDto,
  ): Promise<{ data: FormatLogin; expiresIn: string; Authorization: string }> {
    // find a user in the database
    const user = await this.usersService.findByEmail(loginUserDto);

    // generate and sign token
    const token = this._createToken(user);

    return {
      ...token,
      data: user,
    };
  }

  private _createToken({ email }): {
    expiresIn: string;
    Authorization: string;
  } {
    const user: JwtPayload = { email };
    const Authorization = this.jwtService.sign(user);

    return {
      expiresIn: process.env.EXPIRESIN,
      Authorization,
    };
  }

  async validateUser(payload: JwtPayload): Promise<User> {
    const user: User = await this.usersService.findByPayload(payload);
    if (!user) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }

    return user;
  }
}

export interface RegistrationStatus {
  success: boolean;
  message: string;
  data?: User;
}
