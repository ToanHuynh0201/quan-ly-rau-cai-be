import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JWT_ADMIN_STRATEGY } from '../constants';

@Injectable()
export class AdminJwtAuthGuard extends AuthGuard(JWT_ADMIN_STRATEGY) {}
