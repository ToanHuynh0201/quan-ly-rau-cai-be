import { Injectable } from '@nestjs/common';
import type { User } from '../../../generated/prisma/client';
import { UsersRepository } from './repositories';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findByUsername(username);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  create(data: {
    username: string;
    password: string;
    email?: string;
  }): Promise<User> {
    return this.usersRepository.create(data);
  }
}
