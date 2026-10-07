import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../src/app';

describe('HealthController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/identity/health returns 200 with status ok', async () => {
    const response = await request(app.getHttpServer()).get('/api/identity/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('identity-service');
  });
});
