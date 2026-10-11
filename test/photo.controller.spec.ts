import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import request from 'supertest';
import { createApp } from '../src/app';
import { SessionStore } from '../src/auth/session.store';
import { PERMISSIONS_KEY } from '../src/common/auth/session.decorators';
import { ERROR_MESSAGES } from '../src/common/http-exception.filter';
import { SessionGuard } from '../src/common/auth/session.guard';
import { config, minioSettings } from '../src/config';
import { PrismaClient } from '../src/generated/prisma';
import { PhotoController } from '../src/profile/photo.controller';
import { PhotoStorage } from '../src/profile/photo.storage';

/**
 * Photo upload flow against a real MinIO: the presigned URL is issued only
 * after type and size validation, the bytes actually reach the bucket, the
 * commit swaps the object key together with its outbox event, and reads are
 * served through an authenticated route that never leaves the caller's own
 * photo.
 *
 * MinIO must be running (`docker compose up -d minio` in sources/infra). The
 * suite probes the published ports and points the client at the first one that
 * answers, because the usual host port may be taken by an unrelated process
 * on a developer machine.
 *
 * Everything these tests create — accounts, sessions, outbox rows and objects
 * — is scoped to this suite and removed afterwards.
 */

const UPLOAD_URL = '/api/identity/profile/photo/upload-url';
const COMMIT_URL = '/api/identity/profile/photo/commit';
const SERVE_PATH = '/api/identity/profile/photo';
const PROFILE_URL = '/api/identity/profile';

const OWNER_EMAIL = 'photo-controller-owner@company.com';
const FOREIGN_EMAIL = 'photo-controller-foreign@company.com';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** Smallest payload that still carries the markers of each accepted format. */
const JPEG_BYTES = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('identity-service photo spec payload'),
  Buffer.from([0xff, 0xd9]),
]);
const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('identity-service photo spec payload'),
]);

const cookieFor = (token: string): string => `sid=${token}`;

/** True when MinIO's health endpoint answers 200 on that loopback port. */
async function minioAnswers(port: number): Promise<boolean> {
  const endpoint = process.env.MINIO_ENDPOINT ?? '127.0.0.1';
  try {
    const response = await fetch(
      `http://${endpoint}:${port}/minio/health/live`,
      { signal: AbortSignal.timeout(1_500) },
    );
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Points the object-storage client at a port that actually speaks MinIO:
 * the configured one first, then the extra host port this environment
 * publishes. Fails loudly instead of timing out on every request when no
 * MinIO is up at all.
 */
async function resolveMinioPort(): Promise<void> {
  process.env.MINIO_ENDPOINT ??= '127.0.0.1';
  const candidates = [
    Number(process.env.MINIO_PORT ?? minioSettings().port),
    9000,
    9100,
  ];
  for (const port of new Set(candidates)) {
    if (await minioAnswers(port)) {
      process.env.MINIO_PORT = String(port);
      return;
    }
  }
  throw new Error(
    'MinIO is not reachable on any known port; start it with "docker compose up -d minio" in sources/infra',
  );
}

describe('profile photo endpoints', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let store: SessionStore;
  let raw: Redis;
  let storage: PhotoStorage;
  let baseUrl = '';
  let ownerId = '';
  let foreignId = '';
  const issuedTokens: string[] = [];
  const createdObjects: string[] = [];

  const seedSession = async (employeeId: string): Promise<string> => {
    const token = randomBytes(32).toString('base64url');
    await store.create(token, {
      employeeId,
      role: 'employee',
      mustChangePassword: false,
    });
    issuedTokens.push(token);
    return token;
  };

  const eventsFor = (employeeId: string) =>
    prisma.profileChangeEvent.findMany({
      where: { employeeId },
      orderBy: { occurredAt: 'asc' },
    });

  const uploadUrl = (
    token: string | undefined,
    payload: Record<string, unknown>,
  ) => {
    const call = request(app.getHttpServer()).post(UPLOAD_URL).send(payload);
    return token === undefined ? call : call.set('Cookie', cookieFor(token));
  };

  const commit = (token: string, payload: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post(COMMIT_URL)
      .set('Cookie', cookieFor(token))
      .send(payload);

  const getProfile = (token: string) =>
    request(app.getHttpServer())
      .get(PROFILE_URL)
      .set('Cookie', cookieFor(token));

  /** Requests a photo through the serve route using raw fetch for the bytes. */
  const fetchPhoto = async (token: string | undefined) =>
    fetch(`${baseUrl}${SERVE_PATH}`, {
      headers: token === undefined ? {} : { Cookie: cookieFor(token) },
    });

  /** Issues a presigned URL and uploads real bytes to it, like a browser would. */
  const uploadPhoto = async (
    token: string,
    contentType: string,
    bytes: Buffer,
  ): Promise<string> => {
    const issued = await uploadUrl(token, {
      contentType,
      sizeBytes: bytes.length,
    });
    expect(issued.status).toBe(200);
    const { presignedUrl, objectKey } = issued.body as {
      presignedUrl: string;
      objectKey: string;
    };
    createdObjects.push(objectKey);

    const put = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: bytes,
    });
    expect(put.status).toBe(200);
    return objectKey;
  };

  const upsertAccount = async (email: string): Promise<string> => {
    const row = await prisma.employee.upsert({
      where: { email },
      update: { photoObjectKey: null, phone: '+62-811-0000-0707' },
      create: {
        email,
        name: `Photo Controller Spec ${email}`,
        position: 'QA Engineer',
        phone: '+62-811-0000-0707',
        photoObjectKey: null,
        passwordHash: '$argon2id$v=19$m=19456,p=1,t=2$unused-by-this-suite',
        role: 'employee',
        status: 'active',
        mustChangePassword: false,
      },
    });
    return row.id;
  };

  const resetPhotoState = async (employeeId: string) => {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { photoObjectKey: null },
    });
    await prisma.profileChangeEvent.deleteMany({ where: { employeeId } });
  };

  beforeAll(async () => {
    await resolveMinioPort();

    prisma = new PrismaClient();
    raw = new Redis(config.redisUrl);
    store = new SessionStore({ redisUrl: config.redisUrl });

    ownerId = await upsertAccount(OWNER_EMAIL);
    foreignId = await upsertAccount(FOREIGN_EMAIL);

    app = await createApp();
    await app.listen(0);
    const address = app.getHttpServer().address();
    if (address === null || typeof address === 'string') {
      throw new Error('could not determine the test server port');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;

    storage = app.get(PhotoStorage);
    await storage.ensureBucket();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await Promise.all(
      createdObjects.map(async (objectKey) => {
        try {
          await storage.remove(objectKey);
        } catch {
          // Already gone: the suite only tries to leave the bucket clean.
        }
      }),
    );
    const employeeIds = [ownerId, foreignId].filter((id) => id !== '');
    if (employeeIds.length > 0) {
      await prisma.profileChangeEvent.deleteMany({
        where: { employeeId: { in: employeeIds } },
      });
      await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
    }
    if (issuedTokens.length > 0) {
      await raw.del(...issuedTokens.map((token) => `sess:${token}`));
    }
    await store.quit();
    await prisma.$disconnect();
    raw.disconnect();
  });

  beforeEach(async () => {
    await resetPhotoState(ownerId);
    await resetPhotoState(foreignId);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('route protection', () => {
    it('guards the presign route with the session guard and profile:update_own', () => {
      const reflector = new Reflector();
      expect(
        reflector.getAllAndOverride(GUARDS_METADATA, [
          PhotoController.prototype.uploadUrl,
          PhotoController,
        ]),
      ).toEqual([SessionGuard]);
      expect(
        reflector.get(PERMISSIONS_KEY, PhotoController.prototype.uploadUrl),
      ).toEqual(['profile:update_own']);
    });

    it('guards the commit route with the session guard and profile:update_own', () => {
      const reflector = new Reflector();
      expect(
        reflector.getAllAndOverride(GUARDS_METADATA, [
          PhotoController.prototype.commitPhoto,
          PhotoController,
        ]),
      ).toEqual([SessionGuard]);
      expect(
        reflector.get(PERMISSIONS_KEY, PhotoController.prototype.commitPhoto),
      ).toEqual(['profile:update_own']);
    });

    it('serves photos behind the session guard and without a permission requirement', () => {
      const reflector = new Reflector();
      expect(
        reflector.getAllAndOverride(GUARDS_METADATA, [
          PhotoController.prototype.servePhoto,
          PhotoController,
        ]),
      ).toEqual([SessionGuard]);
      expect(
        reflector.get(PERMISSIONS_KEY, PhotoController.prototype.servePhoto),
      ).toBeUndefined();
    });
  });

  describe('POST /profile/photo/upload-url', () => {
    it('answers 401 AUTH_REQUIRED without a session cookie', async () => {
      const response = await uploadUrl(undefined, {
        contentType: 'image/jpeg',
        sizeBytes: JPEG_BYTES.length,
      });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        statusCode: 401,
        code: 'AUTH_REQUIRED',
      });
    });

    it('refuses a content type that is neither jpeg nor png with PHOTO_TYPE', async () => {
      const token = await seedSession(ownerId);
      const presign = jest.spyOn(storage, 'presignPut');

      const webp = await uploadUrl(token, {
        contentType: 'image/webp',
        sizeBytes: 1024,
      });
      const gif = await uploadUrl(token, {
        contentType: 'image/gif',
        sizeBytes: 1024,
      });

      expect(webp.status).toBe(400);
      expect(webp.body).toEqual({
        statusCode: 400,
        code: 'PHOTO_TYPE',
        message: ERROR_MESSAGES.id.PHOTO_TYPE,
      });
      expect(gif.status).toBe(400);
      expect(gif.body).toMatchObject({
        statusCode: 400,
        code: 'PHOTO_TYPE',
      });
      expect(presign).not.toHaveBeenCalled();
    });

    it('refuses a file larger than two megabytes before any URL is signed', async () => {
      const token = await seedSession(ownerId);
      const presign = jest.spyOn(storage, 'presignPut');

      const response = await uploadUrl(token, {
        contentType: 'image/jpeg',
        sizeBytes: MAX_PHOTO_BYTES + 1,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        code: 'PHOTO_TOO_LARGE',
        message: ERROR_MESSAGES.id.PHOTO_TOO_LARGE,
      });
      expect(response.body).not.toHaveProperty('presignedUrl');
      expect(presign).not.toHaveBeenCalled();
    });

    it('refuses a missing or malformed size with 400 BAD_REQUEST', async () => {
      const token = await seedSession(ownerId);

      const missing = await uploadUrl(token, { contentType: 'image/png' });
      expect(missing.status).toBe(400);
      expect(missing.body).toMatchObject({
        statusCode: 400,
        code: 'BAD_REQUEST',
      });

      const negative = await uploadUrl(token, {
        contentType: 'image/png',
        sizeBytes: -1,
      });
      expect(negative.status).toBe(400);
      expect(negative.body).toMatchObject({
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    });

    it('accepts exactly two megabytes and issues a key under the caller prefix', async () => {
      const token = await seedSession(ownerId);

      const response = await uploadUrl(token, {
        contentType: 'image/png',
        sizeBytes: MAX_PHOTO_BYTES,
      });

      expect(response.status).toBe(200);
      const { presignedUrl, objectKey } = response.body as {
        presignedUrl: string;
        objectKey: string;
      };
      expect(objectKey.startsWith(`employees/${ownerId}/`)).toBe(true);
      expect(objectKey.endsWith('.png')).toBe(true);
      expect(presignedUrl).toContain(objectKey);
      expect(presignedUrl.startsWith('http')).toBe(true);
      createdObjects.push(objectKey);
    });
  });

  describe('upload, commit and serve', () => {
    it('stores uploaded bytes, swaps the key with one event and serves them back', async () => {
      const token = await seedSession(ownerId);

      const objectKey = await uploadPhoto(token, 'image/jpeg', JPEG_BYTES);

      const committed = await commit(token, { objectKey });
      expect(committed.status).toBe(200);
      expect(committed.body).toEqual({
        name: `Photo Controller Spec ${OWNER_EMAIL}`,
        email: OWNER_EMAIL,
        position: 'QA Engineer',
        phone: '+62-811-0000-0707',
        photoUrl: SERVE_PATH,
        role: 'employee',
      });

      const events = await eventsFor(ownerId);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        employeeId: ownerId,
        actorId: ownerId,
        actorRole: 'employee',
        changedFields: ['photo'],
        beforeValues: { photo: null },
        afterValues: { photo: objectKey },
        publishedAt: null,
      });

      const employee = await prisma.employee.findUnique({
        where: { id: ownerId },
      });
      expect(employee?.photoObjectKey).toBe(objectKey);

      const profile = await getProfile(token);
      expect(profile.status).toBe(200);
      expect(profile.body.photoUrl).toBe(SERVE_PATH);

      const served = await fetchPhoto(token);
      expect(served.status).toBe(200);
      expect(served.headers.get('content-type')).toContain('image/jpeg');
      expect(Buffer.from(await served.arrayBuffer()).equals(JPEG_BYTES)).toBe(
        true,
      );
    });

    it('serves png bytes with a png content type after a second commit', async () => {
      const token = await seedSession(ownerId);

      const firstKey = await uploadPhoto(token, 'image/jpeg', JPEG_BYTES);
      expect((await commit(token, { objectKey: firstKey })).status).toBe(200);
      const secondKey = await uploadPhoto(token, 'image/png', PNG_BYTES);
      expect((await commit(token, { objectKey: secondKey })).status).toBe(200);

      const served = await fetchPhoto(token);
      expect(served.status).toBe(200);
      expect(served.headers.get('content-type')).toContain('image/png');
      expect(
        Buffer.from(await served.arrayBuffer()).equals(PNG_BYTES),
      ).toBe(true);

      // The replaced object is gone from the bucket; the current one remains.
      expect(await storage.exists(firstKey)).toBe(false);
      expect(await storage.exists(secondKey)).toBe(true);

      const events = await eventsFor(ownerId);
      expect(events).toHaveLength(2);
      // Chronological: first commit replaced null with the jpeg key, second
      // commit replaced the jpeg key with the png key.
      expect(events.map((event) => event.beforeValues)).toEqual([
        { photo: null },
        { photo: firstKey },
      ]);
      expect(events.map((event) => event.afterValues)).toEqual([
        { photo: firstKey },
        { photo: secondKey },
      ]);
    });

    it('refuses an object key that belongs to another employee with 404', async () => {
      const ownerToken = await seedSession(ownerId);
      const foreignToken = await seedSession(foreignId);
      const foreignKey = await uploadPhoto(
        foreignToken,
        'image/jpeg',
        JPEG_BYTES,
      );

      const response = await commit(ownerToken, { objectKey: foreignKey });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: ERROR_MESSAGES.id.NOT_FOUND,
      });
      const owner = await prisma.employee.findUnique({
        where: { id: ownerId },
      });
      expect(owner?.photoObjectKey).toBeNull();
      expect(await eventsFor(ownerId)).toHaveLength(0);
      // The foreign upload itself is untouched.
      expect(await storage.exists(foreignKey)).toBe(true);
    });

    it('refuses an object key that does not exist in the bucket with 404', async () => {
      const token = await seedSession(ownerId);
      const missingKey = `employees/${ownerId}/${randomBytes(8).toString('hex')}.jpg`;

      const response = await commit(token, { objectKey: missingKey });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(await eventsFor(ownerId)).toHaveLength(0);
    });

    it('refuses a body without a usable objectKey with 404', async () => {
      const token = await seedSession(ownerId);

      const missing = await commit(token, {});
      expect(missing.status).toBe(404);

      const traversal = await commit(token, {
        objectKey: 'employees/../someone-else/x.jpg',
      });
      expect(traversal.status).toBe(404);
      expect(await eventsFor(ownerId)).toHaveLength(0);
    });
  });

  describe('GET /profile/photo', () => {
    it('answers 401 AUTH_REQUIRED without a session cookie', async () => {
      const response = await fetchPhoto(undefined);

      expect(response.status).toBe(401);
    });

    it('answers 404 while the caller has no photo, even if another employee does', async () => {
      const ownerToken = await seedSession(ownerId);
      const foreignToken = await seedSession(foreignId);
      const foreignKey = await uploadPhoto(
        foreignToken,
        'image/jpeg',
        JPEG_BYTES,
      );
      expect((await commit(foreignToken, { objectKey: foreignKey })).status).toBe(
        200,
      );

      expect((await fetchPhoto(foreignToken)).status).toBe(200);
      expect((await fetchPhoto(ownerToken)).status).toBe(404);
    });
  });
});
