import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { assertValidEnv } from './env-validation';

@Injectable()
export class EnvValidationService implements OnModuleInit {
  private readonly logger = new Logger(EnvValidationService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    assertValidEnv((key) => {
      const value = this.config.get<string | number>(key);
      return value === undefined || value === null ? undefined : String(value);
    }, this.logger);
    this.logger.log('Environment validation passed');
  }
}
