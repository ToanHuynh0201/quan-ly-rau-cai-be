import { Injectable } from '@nestjs/common';
import type { User } from '../../../../generated/prisma/client';
import { PrismaService } from '../../database';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      omit: { password: true },
    }) as Promise<User | null>;
  }

  create(data: {
    username: string;
    password: string;
    email?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        username: data.username,
        password: data.password,
        email: data.email,
      },
    });
  }
}
