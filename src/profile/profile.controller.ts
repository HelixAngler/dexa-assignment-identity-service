import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AppException } from '../common/app.exception';
import {
  RequirePermission,
  type GuardedRequest,
  SessionGuard,
} from '../common/auth/session.guard';
import { PrismaService } from '../common/prisma.service';
import { GLOBAL_PREFIX } from '../config';
import { ProfileService } from './profile.service';

/**
 * URL of the route that serves the caller's own photo, relative to the site
 * origin: the browser then reuses the session cookie it already holds and the
 * same-origin path keeps working behind the edge proxy.
 */
export const PHOTO_URL = `/${GLOBAL_PREFIX}/profile/photo`;

/**
 * Characters a phone number may contain: digits plus the separators people
 * actually type — space, `+`, `-`, `.` and parentheses. Letters, `@`, `/` and
 * every other symbol are refused outright.
 */
const PHONE_CHARACTERS = /^[0-9+\-(). ]*$/;

/** Minimum number of digits a phone number must carry, separators ignored. */
const MIN_PHONE_DIGITS = 8;

/** The five fields the profile screen shows; three of them are read-only. */
export interface ProfileResponse {
  name: string;
  email: string;
  position: string;
  phone: string;
  photoUrl: string | null;
}

interface EmployeeProfileRow {
  name: string;
  email: string;
  position: string;
  phone: string;
  photoObjectKey: string | null;
}

/**
 * Phone rule: only the allowed characters, and after stripping every
 * character that is not a digit, at least eight digits remain. Both halves
 * must hold — a string of punctuation alone carries no digits, and a long
 * letter soup is refused by the character rule before length is considered.
 */
export function isUsablePhone(phone: string): boolean {
  if (!PHONE_CHARACTERS.test(phone)) {
    return false;
  }
  let digits = 0;
  for (const character of phone) {
    if (character >= '0' && character <= '9') {
      digits += 1;
    }
  }
  return digits >= MIN_PHONE_DIGITS;
}

/**
 * Turns a profile row into the five-field body every profile route answers
 * with, so the screen renders the same shape after a phone change, a photo
 * change or a plain read.
 */
export function toProfileResponse(
  employee: EmployeeProfileRow,
): ProfileResponse {
  return {
    name: employee.name,
    email: employee.email,
    position: employee.position,
    phone: employee.phone,
    photoUrl: employee.photoObjectKey === null ? null : PHOTO_URL,
  };
}

/**
 * The employee's own profile.
 *
 * `GET` reads the five displayed fields; `name`, `email` and `position` are
 * owned by HRD and are never written here — the PATCH handler reads only the
 * `phone` key of the body, so any other key a client sends (even one naming a
 * read-only field) is ignored rather than applied.
 *
 * Both routes take their identity from the session the guard loaded, never
 * from anything the caller supplied, and both answer with the profile as it
 * stands after the change so the screen can re-render from one response.
 */
@Controller('profile')
@UseGuards(SessionGuard)
export class ProfileController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profile: ProfileService,
  ) {}

  @Get()
  @RequirePermission('profile:read_own')
  async getProfile(@Req() request: GuardedRequest): Promise<ProfileResponse> {
    const employee = await this.loadOwn(request);
    return toProfileResponse(employee);
  }

  @Patch()
  @RequirePermission('profile:update_own')
  async updateProfile(
    @Body() body: Record<string, unknown>,
    @Req() request: GuardedRequest,
  ): Promise<ProfileResponse> {
    const session = request.session;
    if (!session) {
      throw new AppException(401, 'AUTH_REQUIRED');
    }

    const raw = body?.phone;
    const phone = typeof raw === 'string' ? raw.trim() : null;
    if (phone === null || !isUsablePhone(phone)) {
      throw new AppException(400, 'PHONE_INVALID');
    }

    await this.profile.changePhone(session.employeeId, phone, session.role);

    return toProfileResponse(await this.loadOwn(request));
  }

  /** Loads the caller's own row, treating a vanished account as a dead session. */
  private async loadOwn(request: GuardedRequest): Promise<EmployeeProfileRow> {
    const session = request.session;
    if (!session) {
      throw new AppException(401, 'AUTH_REQUIRED');
    }
    const employee = await this.prisma.employee.findUnique({
      where: { id: session.employeeId },
    });
    if (!employee) {
      throw new AppException(401, 'AUTH_REQUIRED');
    }
    return employee;
  }
}
