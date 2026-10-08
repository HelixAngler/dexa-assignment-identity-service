import argon2 from 'argon2';
import * as changeEventModule from '../src/profile/change-event';
import { AppException } from '../src/common/app.exception';
import type { PrismaService } from '../src/common/prisma.service';
import { PrismaClient } from '../src/generated/prisma';
import { ProfileService } from '../src/profile/profile.service';
import { PASSWORD_HASH_OPTIONS } from '../src/auth/password.policy';

/**
 * Atomicity of a profile write: the profile row and its outbox event are one
 * database transaction, so a failure after the profile write but before the
 * event leaves nothing behind at all.
 *
 * The failure is simulated by making the event builder - the step that sits
 * between the profile write and the outbox insert - throw. Every assertion is
 * scoped to the single employee this suite creates, so other suites running
 * against the same database cannot disturb it.
 */

const EMAIL = 'profile-service-spec@company.com';

describe('ProfileService', () => {
  let prisma: PrismaClient;
  let profile: ProfileService;
  let employeeId = '';

  const eventsForSelf = () =>
    prisma.profileChangeEvent.findMany({ where: { employeeId } });

  const employeeRow = async () => {
    const row = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!row) {
      throw new Error('test employee vanished mid-test');
    }
    return row;
  };

  beforeAll(async () => {
    prisma = new PrismaClient();
    const passwordHash = await argon2.hash('Copper-Ledger-2048', PASSWORD_HASH_OPTIONS);
    const row = await prisma.employee.upsert({
      where: { email: EMAIL },
      update: { passwordHash, phone: '+62-811-0000-4242', photoObjectKey: null },
      create: {
        email: EMAIL,
        name: 'Profile Service Spec',
        position: 'QA Engineer',
        phone: '+62-811-0000-4242',
        photoObjectKey: null,
        passwordHash,
        role: 'employee',
        status: 'active',
        mustChangePassword: false,
      },
    });
    employeeId = row.id;
    profile = new ProfileService(prisma as unknown as PrismaService);
  });

  afterAll(async () => {
    if (employeeId !== '') {
      await prisma.profileChangeEvent.deleteMany({ where: { employeeId } });
      await prisma.employee.deleteMany({ where: { id: employeeId } });
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.profileChangeEvent.deleteMany({ where: { employeeId } });
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        phone: '+62-811-0000-4242',
        photoObjectKey: null,
        mustChangePassword: false,
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('changePhone', () => {
    it('writes the new phone and exactly one outbox event in the same commit', async () => {
      const result = await profile.changePhone(
        employeeId,
        '0811-9999-1000',
        'employee',
      );

      expect(result).toEqual({
        before: '+62-811-0000-4242',
        after: '0811-9999-1000',
      });
      expect((await employeeRow()).phone).toBe('0811-9999-1000');

      const events = await eventsForSelf();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        employeeId,
        actorId: employeeId,
        actorRole: 'employee',
        changedFields: ['phone'],
        beforeValues: { phone: '+62-811-0000-4242' },
        afterValues: { phone: '0811-9999-1000' },
        publishedAt: null,
      });
      expect(events[0].occurredAt).toBeInstanceOf(Date);
    });

    it('rolls the phone back when the event cannot be built after the write', async () => {
      jest
        .spyOn(changeEventModule, 'buildProfileChangedEvent')
        .mockImplementation(() => {
          throw new Error('simulated failure between write and event');
        });

      await expect(
        profile.changePhone(employeeId, '0811-9999-2000', 'employee'),
      ).rejects.toThrow('simulated failure between write and event');

      expect((await employeeRow()).phone).toBe('+62-811-0000-4242');
      expect(await eventsForSelf()).toHaveLength(0);
    });

    it('refuses a session whose account no longer exists and writes nothing', async () => {
      const vanishedId = '00000000-0000-4000-8000-000000000001';

      const error = await profile
        .changePhone(vanishedId, '0811-9999-3000', 'employee')
        .then(() => null)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(AppException);
      expect(error).toMatchObject({ statusCode: 401, code: 'AUTH_REQUIRED' });
      const rows = await prisma.profileChangeEvent.findMany({
        where: { employeeId: vanishedId },
      });
      expect(rows).toHaveLength(0);
    });
  });

  describe('changePhoto', () => {
    it('swaps the object key and records both keys in one outbox event', async () => {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { photoObjectKey: 'employees/old-key/previous.png' },
      });

      const result = await profile.changePhoto(
        employeeId,
        'employees/new-key/replacement.jpg',
        'employee',
      );

      expect(result).toEqual({
        before: 'employees/old-key/previous.png',
        after: 'employees/new-key/replacement.jpg',
      });
      expect((await employeeRow()).photoObjectKey).toBe(
        'employees/new-key/replacement.jpg',
      );

      const events = await eventsForSelf();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        changedFields: ['photo'],
        beforeValues: { photo: 'employees/old-key/previous.png' },
        afterValues: { photo: 'employees/new-key/replacement.jpg' },
        actorId: employeeId,
        actorRole: 'employee',
      });
    });

    it('records a first photo against an explicit null before value', async () => {
      const result = await profile.changePhoto(
        employeeId,
        'employees/first-key/portrait.jpg',
        'employee',
      );

      expect(result.before).toBeNull();
      const events = await eventsForSelf();
      expect(events).toHaveLength(1);
      expect(events[0].beforeValues).toEqual({ photo: null });
    });

    it('rolls the object key back when the event cannot be built after the write', async () => {
      jest
        .spyOn(changeEventModule, 'buildProfileChangedEvent')
        .mockImplementation(() => {
          throw new Error('simulated failure between write and event');
        });

      await expect(
        profile.changePhoto(employeeId, 'employees/x/y.jpg', 'employee'),
      ).rejects.toThrow('simulated failure between write and event');

      expect((await employeeRow()).photoObjectKey).toBeNull();
      expect(await eventsForSelf()).toHaveLength(0);
    });
  });

  describe('changePassword', () => {
    it('stores the new hash and writes one redacted outbox event', async () => {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { mustChangePassword: true },
      });
      const newPassword = 'Harbour-Lantern-5521';
      const newHash = await argon2.hash(newPassword, PASSWORD_HASH_OPTIONS);

      await profile.changePassword(employeeId, newHash, 'employee');

      const employee = await employeeRow();
      expect(employee.passwordHash).toBe(newHash);
      await expect(
        argon2.verify(employee.passwordHash, newPassword),
      ).resolves.toBe(true);
      expect(employee.mustChangePassword).toBe(false);

      const events = await eventsForSelf();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        changedFields: ['password'],
        actorId: employeeId,
        actorRole: 'employee',
        beforeValues: { password: '[redacted]' },
        afterValues: { password: '[redacted]' },
      });

      const serialized = JSON.stringify(events[0]);
      expect(serialized).not.toContain(newPassword);
      expect(serialized).not.toContain('$argon2');
    });

    it('rolls the hash back when the event cannot be built after the write', async () => {
      const before = (await employeeRow()).passwordHash;
      jest
        .spyOn(changeEventModule, 'buildProfileChangedEvent')
        .mockImplementation(() => {
          throw new Error('simulated failure between write and event');
        });

      await expect(
        profile.changePassword(
          employeeId,
          '$argon2id$v=19$m=19456,p=1,t=2$never$written',
          'employee',
        ),
      ).rejects.toThrow('simulated failure between write and event');

      expect((await employeeRow()).passwordHash).toBe(before);
      expect(await eventsForSelf()).toHaveLength(0);
    });
  });
});
