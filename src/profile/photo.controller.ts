import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AppException } from '../common/app.exception';
import {
  RequirePermission,
  type GuardedRequest,
  SessionGuard,
} from '../common/auth/session.guard';
import { PrismaService } from '../common/prisma.service';
import type { SessionPayload } from '../auth/session.store';
import { PhotoStorage } from './photo.storage';
import { ProfileService } from './profile.service';
import { toProfileResponse, type ProfileResponse } from './profile.controller';

/** Largest file the service will sign an upload for: two mebibytes. */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/**
 * How long an upload URL stays usable. It is long enough for a slow connection
 * to finish the transfer and short enough that an abandoned link cannot be
 * reused for long.
 */
const UPLOAD_TTL_SECONDS = 600;

/** The image types the service accepts, each with the suffix it is stored as. */
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

/** Prefix every photo key lives under; the segment after it is the owner's id. */
const OWNER_PREFIX = 'employees';

interface UploadUrlResponse {
  presignedUrl: string;
  objectKey: string;
}

/**
 * The photo half of the profile: upload, commit and read.
 *
 * The flow is deliberately split so nothing expensive crosses this service:
 * 1. `upload-url` checks what the client claims (image type, size) and signs
 *    one key under the caller's own prefix. Nothing is stored yet, so an
 *    abandoned picker leaves no trace.
 * 2. `commit` accepts a key only when it sits under that same prefix and the
 *    object really exists, then swaps it into the profile in the transaction
 *    that also writes the `profile.changed(photo)` event; the replaced object
 *    is cleaned up afterwards, best effort.
 * 3. `GET profile/photo` streams the caller's own photo back through the
 *    session cookie. The API contract has no read row for it — the profile
 *    screen needs the bytes somewhere, and keeping the bucket private behind
 *    an authenticated route means object keys are never exposed.
 *
 * Identity always comes from the session the guard attached, never from the
 * body: that is what makes the prefix check an ownership check.
 */
@Controller('profile/photo')
@UseGuards(SessionGuard)
export class PhotoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profile: ProfileService,
    private readonly storage: PhotoStorage,
  ) {}

  @Post('upload-url')
  @RequirePermission('profile:update_own')
  @HttpCode(200)
  async uploadUrl(
    @Body() body: Record<string, unknown>,
    @Req() request: GuardedRequest,
  ): Promise<UploadUrlResponse> {
    const session = this.requireSession(request);

    const contentType =
      typeof body?.contentType === 'string' ? body.contentType : null;
    const extension =
      contentType === null ? undefined : EXTENSION_BY_TYPE[contentType];
    if (extension === undefined) {
      throw new AppException(400, 'PHOTO_TYPE');
    }

    const sizeBytes = body?.sizeBytes;
    if (
      typeof sizeBytes !== 'number' ||
      !Number.isInteger(sizeBytes) ||
      sizeBytes <= 0
    ) {
      throw new AppException(400, 'BAD_REQUEST');
    }
    if (sizeBytes > MAX_PHOTO_BYTES) {
      throw new AppException(400, 'PHOTO_TOO_LARGE');
    }

    // The random suffix keeps two picks in the same session apart, and the id
    // in the prefix is what lets commit decide whether a key is the caller's.
    const objectKey = `${OWNER_PREFIX}/${session.employeeId}/${randomBytes(16).toString('hex')}${extension}`;
    const presignedUrl = await this.storage.presignPut(
      objectKey,
      UPLOAD_TTL_SECONDS,
    );
    return { presignedUrl, objectKey };
  }

  @Post('commit')
  @RequirePermission('profile:update_own')
  @HttpCode(200)
  async commitPhoto(
    @Body() body: Record<string, unknown>,
    @Req() request: GuardedRequest,
  ): Promise<ProfileResponse> {
    const session = this.requireSession(request);

    const objectKey =
      typeof body?.objectKey === 'string' ? body.objectKey : null;
    // A key from another employee's prefix, or one that was never uploaded,
    // is refused before anything is written — so a guessed key can neither be
    // attached to the profile nor be used to probe what is in the bucket.
    if (
      objectKey === null ||
      !objectKey.startsWith(`${OWNER_PREFIX}/${session.employeeId}/`) ||
      !(await this.storage.exists(objectKey))
    ) {
      throw new AppException(404, 'NOT_FOUND');
    }

    const change = await this.profile.changePhoto(
      session.employeeId,
      objectKey,
      session.role,
    );
    if (change.before !== null && change.before !== objectKey) {
      await this.storage.remove(change.before);
    }

    return toProfileResponse(await this.loadOwnEmployee(session), session.role);
  }

  @Get()
  async servePhoto(@Req() request: GuardedRequest): Promise<StreamableFile> {
    const session = this.requireSession(request);
    const employee = await this.loadOwnEmployee(session);
    if (employee.photoObjectKey === null) {
      throw new AppException(404, 'NOT_FOUND');
    }
    const object = await this.storage.open(employee.photoObjectKey);
    if (object === null) {
      throw new AppException(404, 'NOT_FOUND');
    }
    return new StreamableFile(object.stream, { type: object.contentType });
  }

  /** Session the guard attached; a missing one means the caller is signed out. */
  private requireSession(request: GuardedRequest): SessionPayload {
    if (!request.session) {
      throw new AppException(401, 'AUTH_REQUIRED');
    }
    return request.session;
  }

  /** Loads the caller's own row, treating a vanished account as a dead session. */
  private async loadOwnEmployee(session: SessionPayload): Promise<{
    name: string;
    email: string;
    position: string;
    phone: string;
    photoObjectKey: string | null;
  }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: session.employeeId },
    });
    if (!employee) {
      throw new AppException(401, 'AUTH_REQUIRED');
    }
    return employee;
  }
}
