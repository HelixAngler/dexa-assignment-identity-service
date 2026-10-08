import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AppException } from '../common/app.exception';
import {
  RequirePermission,
  SessionGuard,
} from '../common/auth/session.guard';
import { isUsablePhone } from '../profile/profile.controller';
import {
  CreateEmployeeInput,
  CreateEmployeeResult,
  EmployeesService,
  EmployeeSummary,
  UpdateEmployeeInput,
} from './employees.service';

/** Shape of a database uuid; anything else cannot name an employee. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Accepts the loosest string people actually type as an address. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

/** Reads a required, non-blank text field or refuses the whole request. */
function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppException(400, 'BAD_REQUEST');
  }
  return value.trim();
}

/**
 * Reads the optional photo reference: absent means "no photo", anything that
 * is not a non-blank string is a malformed request.
 */
function optionalObjectKey(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppException(400, 'BAD_REQUEST');
  }
  return value.trim();
}

function normalizedEmail(value: unknown): string {
  const email = requiredString(value).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new AppException(400, 'BAD_REQUEST');
  }
  return email;
}

function checkedPhone(value: unknown): string {
  const phone = requiredString(value);
  if (!isUsablePhone(phone)) {
    throw new AppException(400, 'PHONE_INVALID');
  }
  return phone;
}

/** Create body: every required field present and in usable shape. */
export function parseCreateBody(
  body: Record<string, unknown>,
): CreateEmployeeInput {
  return {
    name: requiredString(body?.name),
    email: normalizedEmail(body?.email),
    position: requiredString(body?.position),
    phone: checkedPhone(body?.phone),
    photoObjectKey: optionalObjectKey(body?.photo),
  };
}

/**
 * Edit body: only the editable keys are read, each one validated when it is
 * present. Everything else in the payload — status, role, credentials — is
 * ignored rather than applied, because those have their own routes with their
 * own side effects.
 */
export function parseUpdateBody(
  body: Record<string, unknown>,
): UpdateEmployeeInput {
  const patch: UpdateEmployeeInput = {};
  if (body?.name !== undefined) {
    patch.name = requiredString(body.name);
  }
  if (body?.email !== undefined) {
    patch.email = normalizedEmail(body.email);
  }
  if (body?.position !== undefined) {
    patch.position = requiredString(body.position);
  }
  if (body?.phone !== undefined) {
    patch.phone = checkedPhone(body.phone);
  }
  if (body?.photo !== undefined) {
    patch.photoObjectKey = optionalObjectKey(body.photo);
  }
  return patch;
}

/** Status body: exactly one of the two states the account model allows. */
export function parseStatusBody(
  body: Record<string, unknown>,
): 'active' | 'deactivated' {
  const status = body?.status;
  if (status !== 'active' && status !== 'deactivated') {
    throw new AppException(400, 'BAD_REQUEST');
  }
  return status;
}

/** An id that cannot be a database uuid answers like any unknown employee. */
function checkedEmployeeId(id: string): string {
  if (!UUID_PATTERN.test(id)) {
    throw new AppException(404, 'NOT_FOUND');
  }
  return id;
}

/**
 * Employee management for HRD sessions.
 *
 * Every route requires a session and one of the administrative permission
 * codes: reading the directory, creating an account, and editing/resetting
 * status are three distinct grants, so a session that only holds one of them
 * reaches exactly the routes that grant covers. The id a request carries is
 * never taken from the body — the path decides whose record is touched.
 */
@Controller('employees')
@UseGuards(SessionGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermission('employee:read')
  list(): Promise<EmployeeSummary[]> {
    return this.employees.list();
  }

  @Post()
  @RequirePermission('employee:create')
  create(@Body() body: Record<string, unknown>): Promise<CreateEmployeeResult> {
    return this.employees.create(parseCreateBody(body));
  }

  @Patch(':id')
  @RequirePermission('employee:update')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<EmployeeSummary> {
    return this.employees.update(checkedEmployeeId(id), parseUpdateBody(body));
  }

  @Post(':id/reset-password')
  @RequirePermission('employee:update')
  @HttpCode(200)
  resetPassword(@Param('id') id: string): Promise<{ temporaryPassword: string }> {
    return this.employees.resetPassword(checkedEmployeeId(id));
  }

  @Patch(':id/status')
  @RequirePermission('employee:update')
  setStatus(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<EmployeeSummary> {
    return this.employees.setStatus(
      checkedEmployeeId(id),
      parseStatusBody(body),
    );
  }
}
