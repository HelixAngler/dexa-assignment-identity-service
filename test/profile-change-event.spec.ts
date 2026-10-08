import {
  buildProfileChangedEvent,
  type ProfileChangeActor,
  type ProfileChangeField,
} from '../src/profile/change-event';

/**
 * Outbox payload builder for employee-initiated profile changes.
 *
 * The row it describes is written in the same database transaction as the
 * profile write, so every case here checks exactly the fields a downstream
 * consumer reads: who acted, when, which field changed, and the values on both
 * sides of the change. Password events are the one exception - they must never
 * carry secret material, not even when the caller hands values in.
 */

const ACTOR: ProfileChangeActor = {
  employeeId: '8f5f4a1e-0f2a-4c6e-9f21-1a2b3c4d5e6f',
  role: 'employee',
};

const FOREIGN_ACTOR: ProfileChangeActor = {
  employeeId: 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  role: 'hrd',
};

describe('buildProfileChangedEvent', () => {
  it('carries actor, timestamp, changed fields and the before/after values', () => {
    const occurredAt = new Date('2026-10-07T10:12:33.000Z');

    const payload = buildProfileChangedEvent({
      actor: ACTOR,
      changedFields: ['phone'],
      before: { phone: '+62-811-0000-0001' },
      after: { phone: '+62-811-0000-0002' },
      occurredAt,
    });

    expect(payload).toEqual({
      id: expect.any(String),
      employeeId: ACTOR.employeeId,
      actorId: ACTOR.employeeId,
      actorRole: 'employee',
      changedFields: ['phone'],
      beforeValues: { phone: '+62-811-0000-0001' },
      afterValues: { phone: '+62-811-0000-0002' },
      occurredAt,
    });
    expect(payload.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('stamps the current clock when the caller supplies no timestamp', () => {
    const earliest = Date.now();
    const payload = buildProfileChangedEvent({
      actor: ACTOR,
      changedFields: ['phone'],
      before: { phone: '0811-0000-0001' },
      after: { phone: '0811-0000-0002' },
    });
    const latest = Date.now();

    expect(payload.occurredAt.getTime()).toBeGreaterThanOrEqual(earliest);
    expect(payload.occurredAt.getTime()).toBeLessThanOrEqual(latest);
  });

  it('keeps the photo object keys on both sides of the change', () => {
    const payload = buildProfileChangedEvent({
      actor: ACTOR,
      changedFields: ['photo'],
      before: { photo: 'employees/8f5f/previous.png' },
      after: { photo: 'employees/8f5f/replacement.jpg' },
    });

    expect(payload.changedFields).toEqual(['photo']);
    expect(payload.beforeValues).toEqual({
      photo: 'employees/8f5f/previous.png',
    });
    expect(payload.afterValues).toEqual({
      photo: 'employees/8f5f/replacement.jpg',
    });
  });

  it('records a first photo as an explicit null before value', () => {
    const payload = buildProfileChangedEvent({
      actor: ACTOR,
      changedFields: ['photo'],
      before: { photo: null },
      after: { photo: 'employees/8f5f/first.jpg' },
    });

    expect(payload.beforeValues).toEqual({ photo: null });
    expect(payload.afterValues).toEqual({ photo: 'employees/8f5f/first.jpg' });
  });

  it('redacts both sides of a password event and leaks no input value', () => {
    const payload = buildProfileChangedEvent({
      actor: ACTOR,
      changedFields: ['password'],
      before: { password: 'Sunflower-Vault-3391' },
      after: { password: 'Cobalt-Lantern-7305' },
    });

    expect(payload.changedFields).toEqual(['password']);
    expect(payload.beforeValues).toEqual({ password: '[redacted]' });
    expect(payload.afterValues).toEqual({ password: '[redacted]' });

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('Sunflower-Vault-3391');
    expect(serialized).not.toContain('Cobalt-Lantern-7305');
    expect(serialized).not.toContain('$argon2');
  });

  it('redacts a password event even when the caller passes no values at all', () => {
    const payload = buildProfileChangedEvent({
      actor: ACTOR,
      changedFields: ['password'],
    });

    expect(payload.beforeValues).toEqual({ password: '[redacted]' });
    expect(payload.afterValues).toEqual({ password: '[redacted]' });
    expect(payload.id).toEqual(expect.any(String));
    expect(payload.occurredAt).toBeInstanceOf(Date);
  });

  it('keeps non-secret fields of a combined event while still redacting the password', () => {
    const payload = buildProfileChangedEvent({
      actor: FOREIGN_ACTOR,
      changedFields: ['phone', 'password'],
      before: { phone: '0811-0000-0009', password: 'Breeze-Quartz-4410' },
      after: { phone: '0811-0000-0010', password: 'Anchor-Willow-2287' },
    });

    expect(payload.actorRole).toBe('hrd');
    expect(payload.beforeValues).toEqual({
      phone: '0811-0000-0009',
      password: '[redacted]',
    });
    expect(payload.afterValues).toEqual({
      phone: '0811-0000-0010',
      password: '[redacted]',
    });
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('Breeze-Quartz-4410');
    expect(serialized).not.toContain('Anchor-Willow-2287');
  });

  it('copies the inputs instead of aliasing or mutating them', () => {
    const changedFields: ProfileChangeField[] = ['phone'];
    const before = { phone: '0811-0000-0001' };

    const payload = buildProfileChangedEvent({
      actor: ACTOR,
      changedFields,
      before,
      after: { phone: '0811-0000-0002' },
    });

    payload.changedFields.push('password');
    payload.beforeValues.phone = 'rewritten';

    expect(changedFields).toEqual(['phone']);
    expect(before).toEqual({ phone: '0811-0000-0001' });
  });
});
