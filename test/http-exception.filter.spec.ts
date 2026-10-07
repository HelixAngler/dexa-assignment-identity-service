import type { INestApplication } from '@nestjs/common';
import { Controller, Get, NotFoundException } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { createApp } from '../src/app';
import { AppException } from '../src/common/app.exception';
import {
  ERROR_MESSAGES,
  HttpExceptionFilter,
} from '../src/common/http-exception.filter';

@Controller()
class ThrowingController {
  @Get('domain-error')
  domainError(): void {
    throw new AppException(401, 'AUTH_INVALID');
  }

  @Get('attempts-left')
  attemptsLeft(): void {
    throw new AppException(401, 'AUTH_INVALID', { attemptsRemaining: 3 });
  }

  @Get('crash')
  crash(): void {
    throw new Error('internal-details-must-not-leak');
  }

  @Get('framework-404')
  frameworkNotFound(): void {
    throw new NotFoundException('custom framework description');
  }
}

describe('HttpExceptionFilter', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ThrowingController],
      providers: [
        HttpExceptionFilter,
        { provide: APP_FILTER, useExisting: HttpExceptionFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers in Indonesian when no Accept-Language header is sent', async () => {
    const response = await request(app.getHttpServer()).get('/domain-error');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      statusCode: 401,
      code: 'AUTH_INVALID',
      message: ERROR_MESSAGES.id.AUTH_INVALID,
    });
    expect(Object.keys(response.body).sort()).toEqual([
      'code',
      'message',
      'statusCode',
    ]);
  });

  it('answers in English for Accept-Language: en', async () => {
    const response = await request(app.getHttpServer())
      .get('/domain-error')
      .set('Accept-Language', 'en');

    expect(response.body).toEqual({
      statusCode: 401,
      code: 'AUTH_INVALID',
      message: ERROR_MESSAGES.en.AUTH_INVALID,
    });
    expect(response.body.message).not.toBe(ERROR_MESSAGES.id.AUTH_INVALID);
  });

  it('parses Accept-Language loosely: any en* tag selects English, anything else Indonesian', async () => {
    const english = await request(app.getHttpServer())
      .get('/domain-error')
      .set('Accept-Language', 'en-GB,en;q=0.9,id;q=0.8');
    expect(english.body.message).toBe(ERROR_MESSAGES.en.AUTH_INVALID);

    const indonesianTag = await request(app.getHttpServer())
      .get('/domain-error')
      .set('Accept-Language', 'id-ID');
    expect(indonesianTag.body.message).toBe(ERROR_MESSAGES.id.AUTH_INVALID);

    const otherLanguage = await request(app.getHttpServer())
      .get('/domain-error')
      .set('Accept-Language', 'fr');
    expect(otherLanguage.body.message).toBe(ERROR_MESSAGES.id.AUTH_INVALID);
  });

  it('merges AppException details into the error body', async () => {
    const response = await request(app.getHttpServer()).get('/attempts-left');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      statusCode: 401,
      code: 'AUTH_INVALID',
      message: ERROR_MESSAGES.id.AUTH_INVALID,
      attemptsRemaining: 3,
    });
  });

  it('collapses unknown errors to 500 INTERNAL without leaking internals', async () => {
    const response = await request(app.getHttpServer()).get('/crash');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      statusCode: 500,
      code: 'INTERNAL',
      message: ERROR_MESSAGES.id.INTERNAL,
    });
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('internal-details-must-not-leak');
    expect(response.body).not.toHaveProperty('stack');
    expect(response.body).not.toHaveProperty('error');
  });

  it('localizes the generic 500 message too', async () => {
    const response = await request(app.getHttpServer())
      .get('/crash')
      .set('Accept-Language', 'en');

    expect(response.body).toEqual({
      statusCode: 500,
      code: 'INTERNAL',
      message: ERROR_MESSAGES.en.INTERNAL,
    });
  });

  it('restates framework exceptions with a machine code and a localized message', async () => {
    const indonesian = await request(app.getHttpServer()).get('/framework-404');
    expect(indonesian.status).toBe(404);
    expect(indonesian.body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: ERROR_MESSAGES.id.NOT_FOUND,
    });

    const english = await request(app.getHttpServer())
      .get('/framework-404')
      .set('Accept-Language', 'en');
    expect(english.body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: ERROR_MESSAGES.en.NOT_FOUND,
    });
  });
});

describe('filter registered on the real application bootstrap', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('turns an unmatched route into the contract error shape', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/identity/does-not-exist',
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: ERROR_MESSAGES.id.NOT_FOUND,
    });
  });

  it('honours Accept-Language on unmatched routes', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/identity/does-not-exist')
      .set('Accept-Language', 'en');

    expect(response.body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: ERROR_MESSAGES.en.NOT_FOUND,
    });
  });

  it('keeps healthy responses untouched', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/identity/health',
    );

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
