import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus(): string {
    return 'Student tutor matchmaking backend is running in the current environment.';
  }
}
