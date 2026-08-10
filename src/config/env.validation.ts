import { REGEX } from '@/common/constants';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT!: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(15)
  REDIS_DB?: number;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.JWT_TOKEN)
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(REGEX.JWT_TOKEN)
  JWT_REFRESH_EXPIRES_IN: string = '7d';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}

let cachedEnv: EnvironmentVariables | undefined;

export function getValidatedEnv(): EnvironmentVariables {
  if (!cachedEnv) {
    cachedEnv = validate(process.env);
  }
  return cachedEnv;
}
