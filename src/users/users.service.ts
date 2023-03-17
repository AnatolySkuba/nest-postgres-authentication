import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { compare, hash } from 'bcrypt';

import { CreateUserDto, LoginUserDto } from './user.dto';
import { PrismaService } from '../prisma.service';

export interface FormatLogin extends Partial<User> {
  email: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // use by the auth module to register a user in the database
  async create(userDto: CreateUserDto): Promise<User> {
    // check if Administrator have a parentId
    if (userDto.role === 'ADMIN' && userDto.parentId) {
      throw new HttpException(
        "Administrator can't have a parentId",
        HttpStatus.BAD_REQUEST,
      );
    }

    // check if each user except Administrator have a parentId
    if ((userDto.role !== 'ADMIN' || !userDto.role) && !userDto.parentId) {
      throw new HttpException('ParentId is required', HttpStatus.BAD_REQUEST);
    }

    // check if parentId exists in the database
    if (userDto.parentId) {
      const parentIdInDb = await this.prisma.user.findUnique({
        where: { id: userDto.parentId },
      });
      if (!parentIdInDb) {
        throw new HttpException('Wrong parentId', HttpStatus.BAD_REQUEST);
      }

      // check if the parent user has the "REGULAR" role
      const parentUser = await this.prisma.user.findUnique({
        where: { id: userDto.parentId },
      });
      if (parentUser.role === 'REGULAR') {
        await this.prisma.user.update({
          where: { id: userDto.parentId },
          data: { role: 'BOSS' },
        });
      }
    }

    // check if the user exists in the database
    const userInDb = await this.prisma.user.findUnique({
      where: { email: userDto.email },
    });
    if (userInDb) {
      throw new HttpException('User already exists', HttpStatus.CONFLICT);
    }

    const user = await this.prisma.user.create({
      data: {
        ...userDto,
        password: await hash(userDto.password, 10),
      },
    });
    delete user.password;

    return user;
  }

  // use by the users module to get list of users in the database
  async getAllUsers(id: string): Promise<User[]> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new HttpException('invalid_credentials', HttpStatus.UNAUTHORIZED);
    }

    // if the user role is REGULAR
    delete user.password;
    if (user.role === 'REGULAR') return [user];

    // if the user role is ADMIN
    if (user.role === 'ADMIN') {
      const users = await this.prisma.user.findMany();
      users.forEach((user) => delete user.password);

      return users;
    }

    // if the user role is BOSS
    const users = await this.getChildren(user);
    users.forEach((user) => delete user.password);

    return users;
  }

  // recursively get all users
  async getChildren(parent: User): Promise<User[]> {
    const new_arr = [];
    const getSubChildren = async (arr: User[]) => {
      for (const element of arr) {
        const children = await this.prisma.user.findMany({
          where: { parentId: element.id },
        });
        new_arr.push(element);
        if (Array.isArray(children) && children.length) {
          await getSubChildren(children);
        }
      }
    };
    await getSubChildren([parent]);

    return new_arr;
  }

  // use by the users module to update the user's boss
  async updateBoss(
    id: string,
    childId: string,
    newBossId: string,
  ): Promise<User> {
    // check the user ID
    await this.checkUserId(id);

    // check the child's user ID
    const childUser = await this.checkUserId(childId);
    if (childUser.parentId !== id) {
      throw new HttpException(
        'Only the boss can change the boss of the user and only for her subordinates',
        HttpStatus.BAD_REQUEST,
      );
    }

    // check the user ID of the new boss
    await this.checkUserId(newBossId);

    return await this.prisma.user.update({
      where: { id: childId },
      data: { parentId: newBossId },
    });
  }

  // use by the auth module to find a user by email and password
  async findByEmail({ email, password }: LoginUserDto): Promise<FormatLogin> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new HttpException('Wrong email', HttpStatus.UNAUTHORIZED);
    }

    // compare passwords
    const areEqual = await compare(password, user.password);

    if (!areEqual) {
      throw new HttpException('Wrong password', HttpStatus.UNAUTHORIZED);
    }
    delete user.password;

    return user;
  }

  // use by the auth module to get user in database by payload (email)
  async findByPayload({ email }: { email: string }): Promise<User> {
    return await this.prisma.user.findUnique({
      where: { email },
    });
  }

  // check user ID
  async checkUserId(userId: string): Promise<User> {
    try {
      return await this.prisma.user.findUnique({
        where: { id: userId },
      });
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
  }
}
