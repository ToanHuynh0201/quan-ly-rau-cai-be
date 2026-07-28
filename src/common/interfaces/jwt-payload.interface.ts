import { Role } from '../../generated/prisma/enums';

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: Role;
}
