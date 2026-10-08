import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { SessionStore } from '../auth/session.store';
import { PASSWORD_HASH_OPTIONS } from '../auth/password.policy';
import { AppException } from '../common/app.exception';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '../generated/prisma';
import { CloseOpenClient } from './close-open.client';
import { generateTemporaryPassword } from './temp-password';

/** The five fields every employee-management route answers with. */
export interface EmployeeSummary {
  id: string;
  name: string;
  email: string;
  position: string;
  status: 'active' | 'deactivated';
}

/** Fields an HRD admin supplies when an account is created. */
export interface CreateEmployeeInput {
  name: string;
  email: string;
  position: string;
  phone: string;
  photoObjectKey: string | null;
}

/** The editable subset an HRD admin may change after creation. */
export interface UpdateEmployeeInput {
  name?: string;
  email?: string;
  position?: string;
  phone?: string;
  photoObjectKey?: string | null;
}

/** What create answers with: the id plus the password shown exactly once. */
export interface CreateEmployeeResult {
  id: string;
  temporaryPassword: string;
  mustChangePassword: true;
}

/** Narrow selection that keeps credential material out of every response. */
const SUMMARY_SELECT = {
  id: true,
  name: true,
  email: true,
  position: true,
  status: true,
} as const;

/** True for the database's "a unique constraint rejected this write" answer. */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/**
 * Employee records as HRD maintains them.
 *
 * Reads and writes here are plain administration: no change event is emitted
 * for anything this service does, because the admin already knows what they
 * changed and the change banner is aimed at employees editing themselves.
 *
 * Password material follows one rule everywhere — generate the one-time value,
 * hash it with the shared argon2 parameters, hand the plaintext back to the
 * caller exactly once and never store or return it again.
 *
 * Deactivation is deliberately staged: the row is committed first, then every
 * live session of that employee is dropped, and only then is the attendance
 * service asked to close a session the employee may have left open. The last
 * step is best effort with a bounded number of retries — an attendance
 * service that is down must not roll back or fail an already-committed
 * deactivation, so any exhaustion of attempts is logged and swallowed.
 */
@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionStore,
    private readonly closeOpen: CloseOpenClient,
  ) {}

  /** The directory, alphabetically by name with the address as tiebreak. */
  async list(): Promise<EmployeeSummary[]> {
    return this.prisma.employee.findMany({
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: SUMMARY_SELECT,
    });
  }

  /**
   * Creates an account on a brand-new address together with its one-time
   * password. The uniqueness probe and the insert share one transaction, so a
   * losing race either sees the winner's row or trips the unique index —
   * never a half-written row behind a 409.
   */
  async create(input: CreateEmployeeInput): Promise<CreateEmployeeResult> {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await argon2.hash(
      temporaryPassword,
      PASSWORD_HASH_OPTIONS,
    );

    try {
      const employee = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.employee.findUnique({
          where: { email: input.email },
          select: { id: true },
        });
        if (existing) {
          throw new AppException(409, 'EMAIL_TAKEN');
        }
        return tx.employee.create({
          data: {
            name: input.name,
            email: input.email,
            position: input.position,
            phone: input.phone,
            photoObjectKey: input.photoObjectKey,
            role: 'employee',
            status: 'active',
            passwordHash,
            mustChangePassword: true,
          },
          select: { id: true },
        });
      });

      return {
        id: employee.id,
        temporaryPassword,
        mustChangePassword: true,
      };
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new AppException(409, 'EMAIL_TAKEN');
      }
      throw error;
    }
  }

  /**
   * Applies the editable fields an admin sent. Keys outside that set are
   * dropped by the caller before this runs, so a status change can only go
   * through the status route (where it also revokes sessions) and credentials
   * can only change through the reset route.
   */
  async update(
    id: string,
    patch: UpdateEmployeeInput,
  ): Promise<EmployeeSummary> {
    const current = await this.prisma.employee.findUnique({
      where: { id },
      select: SUMMARY_SELECT,
    });
    if (!current) {
      throw new AppException(404, 'NOT_FOUND');
    }

    const data: Prisma.EmployeeUpdateInput = {};
    if (patch.name !== undefined) {
      data.name = patch.name;
    }
    if (patch.email !== undefined) {
      data.email = patch.email;
    }
    if (patch.position !== undefined) {
      data.position = patch.position;
    }
    if (patch.phone !== undefined) {
      data.phone = patch.phone;
    }
    if (patch.photoObjectKey !== undefined) {
      data.photoObjectKey = patch.photoObjectKey;
    }

    if (Object.keys(data).length === 0) {
      return current;
    }
    data.updatedAt = new Date();

    try {
      return await this.prisma.employee.update({
        where: { id },
        data,
        select: SUMMARY_SELECT,
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new AppException(409, 'EMAIL_TAKEN');
      }
      throw error;
    }
  }

  /**
   * Issues a replacement one-time password. The row is rewritten first and
   * every session the employee still holds is dropped second, so the old
   * password stops working on the very next request while the admin is still
   * holding the new one.
   */
  async resetPassword(id: string): Promise<{ temporaryPassword: string }> {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new AppException(404, 'NOT_FOUND');
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await argon2.hash(
      temporaryPassword,
      PASSWORD_HASH_OPTIONS,
    );
    await this.prisma.employee.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        updatedAt: new Date(),
      },
    });
    await this.sessions.deleteAllForEmployee(id);

    return { temporaryPassword };
  }

  /**
   * Flips an account between the two states it may hold. Deactivation runs in
   * a fixed order — commit the row, revoke every session, then notify the
   * attendance service — so a session can never outlive the row it was issued
   * for, and the notification only ever sees an already-deactivated account.
   * The notification itself is retried with growing delays against a
   * per-attempt timeout; when it still fails, the failure is logged and this
   * method answers 200 regardless, because the state change it was asked for
   * has already happened.
   */
  async setStatus(
    id: string,
    status: 'active' | 'deactivated',
  ): Promise<EmployeeSummary> {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new AppException(404, 'NOT_FOUND');
    }

    const employee = await this.prisma.employee.update({
      where: { id },
      data: { status, updatedAt: new Date() },
      select: SUMMARY_SELECT,
    });

    if (status === 'deactivated') {
      await this.sessions.deleteAllForEmployee(id);
      await this.closeOpen.notifyEmployeeDeactivated(id);
    }

    return employee;
  }
}
