import { Injectable } from '@nestjs/common';

export interface AppInfo {
  name: string;
  version: string;
  description: string;
}

@Injectable()
export class AppService {
  getInfo(): AppInfo {
    return {
      name: 'Vegetable Management API',
      version: '1.0',
      description: 'Backend API for the vegetable management system',
    };
  }
}
