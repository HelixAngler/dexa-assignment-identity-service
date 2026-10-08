import { Injectable } from '@nestjs/common';
import { AppException } from '../common/app.exception';
import type { SessionRole } from '../common/auth/permissions';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '../generated/prisma';
import { buildProfileChangedEvent } from './change-event';

export interface PhoneChange {
  before: string;
  after: string;
}

export interface PhotoChange {
  before: string | null;
  after: string;
}

/**
 * Every self-service profile write: the profile row and its outbox event are
 * produced by one database transaction, so the two can never disagree — a
 * saved change always has exactly one event, and a change that fails to save
 * has none.
 *
 * The order inside the transaction is read, write, build event, insert event.
 * Building the event last means a defect in that step (or a future constraint
 * on the row) aborts a write that has already run, and the transaction turns
 * that abort into a rollback rather than a half-applied change.
 *
 * Only employees acting on their own profile reach this service, which is why
 * the actor and the subject are always the same person.
 */
@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /** Stores a new phone number together with its `phone` change event. */
  async changePhone(
    employeeId: string,
    phone: string,
    role: SessionRole,
  ): Promise<PhoneChange> {
    return this.prisma.$transaction(async (tx) => {
      const employee = await this.requireEmployee(tx, employeeId);
      const before = employee.phone;

      await tx.employee.update({
        where: { id: employeeId },
        data: { phone, updatedAt: new Date() },
      });
      await tx.profileChangeEvent.create({
        data: buildProfileChangedEvent({
          actor: { employeeId, role },
          changedFields: ['phone'],
          before: { phone: before },
          after: { phone },
        }),
      });

      return { before, after: phone };
    });
  }

  /**
   * Points the profile at a new photo object together with its `photo` change
   * event. The caller owns the storage side: it validates ownership of the
   * object key and removes the previous object once this transaction has
   * committed.
   */
  async changePhoto(
    employeeId: string,
    objectKey: string,
    role: SessionRole,
  ): Promise<PhotoChange> {
    return this.prisma.$transaction(async (tx) => {
      const employee = await this.requireEmployee(tx, employeeId);
      const before = employee.photoObjectKey;

      await tx.employee.update({
        where: { id: employeeId },
        data: { photoObjectKey: objectKey, updatedAt: new Date() },
      });
      await tx.profileChangeEvent.create({
        data: buildProfileChangedEvent({
          actor: { employeeId, role },
          changedFields: ['photo'],
          before: { photo: before },
          after: { photo: objectKey },
        }),
      });

      return { before, after: objectKey };
    });
  }

  /**
   * Stores the new password hash together with its `password` change event.
   * The event carries no secret material — the builder redacts both sides —
   * and the forced-change flag is cleared in the same commit, because
   * supplying the current password is exactly what that flag asks for.
   */
  async changePassword(
    employeeId: string,
    passwordHash: string,
    role: SessionRole,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.requireEmployee(tx, employeeId);

      await tx.employee.update({
        where: { id: employeeId },
        data: {
          passwordHash,
          mustChangePassword: false,
          updatedAt: new Date(),
        },
      });
      await tx.profileChangeEvent.create({
        data: buildProfileChangedEvent({
          actor: { employeeId, role },
          changedFields: ['password'],
        }),
      });
    });
  }

  /**
   * Loads the account the session points at. A session that outlived its
   * account is worthless, so the caller is told the same thing a missing
   * cookie would say instead of exposing that the row is gone.
   */
  private async requireEmployee(
    tx: Prisma.TransactionClient,
    employeeId: string,
  ): Promise<{ phone: string; photoObjectKey: string | null }> {
    const employee = await tx.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new AppException(401, 'AUTH_REQUIRED');
    }
    return { phone: employee.phone, photoObjectKey: employee.photoObjectKey };
  }
}
