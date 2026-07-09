import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JWT_USER_STRATEGY } from '../constants';

@Injectable()
export class UserJwtAuthGuard extends AuthGuard(JWT_USER_STRATEGY) {}
