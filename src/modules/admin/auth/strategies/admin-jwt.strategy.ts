import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtAdminConfig } from '../../../../config';
import { JWT_ADMIN_STRATEGY } from '../constants';
import type { AccessTokenPayload } from '../../../../common/interfaces/jwt-payload.interface';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(
  Strategy,
  JWT_ADMIN_STRATEGY,
) {
  constructor(
    @Inject(jwtAdminConfig.KEY)
    config: ConfigType<typeof jwtAdminConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.accessSecret,
    });
  }

  validate(payload: AccessTokenPayload): AccessTokenPayload {
    return payload;
  }
}
