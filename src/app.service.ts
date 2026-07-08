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
      name: 'Quản lý rau củ API',
      version: '1.0',
      description: 'API backend cho hệ thống quản lý rau củ',
    };
  }
}
