import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthStatus() {
    return {
      status: 'healthy',
      service: 'Recommendation Traveller Backend Gateway',
      version: 'v1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
