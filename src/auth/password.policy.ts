import argon2 from 'argon2';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Language } from '../common/http-exception.filter';

/** Shortest password every password-setting path accepts, in code points. */
export const MIN_PASSWORD_LENGTH = 8;

/** Longest password every password-setting path accepts, in code points. */
export const MAX_PASSWORD_LENGTH = 128;

/** argon2id parameters every password hash written by this service uses. */
export const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

const DENYLIST_PATH = join(
  __dirname,
  'password-denylist',
  'breached-passwords.txt',
);

function loadBreachedPasswords(): ReadonlySet<string> {
  const entries = readFileSync(DENYLIST_PATH, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
  return new Set(entries);
}

/**
 * Passwords that must never be stored, read once from the file that ships next
 * to this module when the process starts. Keeping the list on disk and loading
 * it here means every password-writing path runs the same rule with no network
 * round trip, and a deployment can audit exactly which values are refused.
 */
export const BREACHED_PASSWORDS: ReadonlySet<string> = loadBreachedPasswords();

/** Why a candidate password was refused; each maps to one message below. */
export type PasswordProblem = 'length' | 'control' | 'breached';

const PROBLEM_MESSAGES: Record<Language, Record<PasswordProblem, string>> = {
  id: {
    length: 'Kata sandi harus terdiri dari 8 sampai 128 karakter.',
    control: 'Kata sandi tidak boleh berisi karakter kontrol.',
    breached:
      'Kata sandi terdaftar dalam daftar kata sandi yang bocor sehingga tidak dapat digunakan.',
  },
  en: {
    length: 'Password must be between 8 and 128 characters long.',
    control: 'Password must not contain control characters.',
    breached:
      'This password appears in a list of breached passwords and cannot be used.',
  },
};

const MISMATCH_MESSAGES: Record<Language, string> = {
  id: 'Konfirmasi kata sandi tidak cocok.',
  en: 'Password confirmation does not match.',
};

/** Localized message for one refusal reason. */
export function passwordProblemMessage(
  problem: PasswordProblem,
  language: Language,
): string {
  return PROBLEM_MESSAGES[language][problem];
}

/** Localized message for a password/confirmation disagreement. */
export function passwordMismatchMessage(language: Language): string {
  return MISMATCH_MESSAGES[language];
}

/**
 * The shared strength rule: 8 to 128 code points, no control characters, and
 * not a known-breached value. Surrounding blanks are folded away before the
 * breach lookup so padding cannot launder a listed password. Any other
 * printable character is accepted — including non-ASCII letters — and no
 * composition rule (letters plus digits plus symbols) is imposed.
 */
export function findPasswordProblem(password: string): PasswordProblem | null {
  const length = [...password].length;
  if (length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
    return 'length';
  }
  if (hasControlCharacter(password)) {
    return 'control';
  }
  if (BREACHED_PASSWORDS.has(password.trim().toLowerCase())) {
    return 'breached';
  }
  return null;
}

/** True for C0 controls, DEL and the C1 range, none of which belong in a password. */
function hasControlCharacter(password: string): boolean {
  for (const character of password) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      return true;
    }
  }
  return false;
}
