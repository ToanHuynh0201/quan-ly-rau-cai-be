import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtUserConfig } from '../../../../config';
import { JWT_USER_STRATEGY } from '../constants';
import type { AccessTokenPayload } from '../../../../common/interfaces/jwt-payload.interface';

@Injectable()
export class UserJwtStrategy extends PassportStrategy(
  Strategy,
  JWT_USER_STRATEGY,
) {
  constructor(
    @Inject(jwtUserConfig.KEY)
    config: ConfigType<typeof jwtUserConfig>,
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
