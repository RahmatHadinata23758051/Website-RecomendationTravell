import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      service: 'Recommendation Traveller Backend Gateway',
      version: 'v1.0.0',
    };
  }
}
