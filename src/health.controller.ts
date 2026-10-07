import { Controller, Get } from '@nestjs/common';

export interface HealthPayload {
  status: 'ok';
  service: 'identity-service';
}

@Controller('health')
export class HealthController {
  @Get()
  getStatus(): HealthPayload {
    return { status: 'ok', service: 'identity-service' };
  }
}
