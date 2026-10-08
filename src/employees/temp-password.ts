import { randomBytes, randomInt } from 'node:crypto';
import { findPasswordProblem } from '../auth/password.policy';

/**
 * First half of the readable shape a one-time password is built from:
 * `Word-Word-Digits`, the same style the local demo accounts use, so an HRD
 * admin reads it over the phone without mangling it.
 */
const LEADING_WORDS = [
  'Amber',
  'Brisk',
  'Cedar',
  'Cloud',
  'Coral',
  'Ember',
  'Frost',
  'Golden',
  'Harbor',
  'Ivory',
  'Jade',
  'Lively',
  'Maple',
  'Mellow',
  'Noble',
  'Opal',
  'Piano',
  'Quiet',
  'Rapid',
  'Silver',
  'Sunny',
  'Tulip',
  'Vivid',
  'Witty',
];

/** Second half of that shape, paired with the leading word at random. */
const TRAILING_WORDS = [
  'Anchor',
  'Breeze',
  'Comet',
  'Dolphin',
  'Falcon',
  'Harvest',
  'Kestrel',
  'Lantern',
  'Meadow',
  'Nimbus',
  'Otter',
  'Pebble',
  'Quartz',
  'Ridge',
  'Sparrow',
  'Thicket',
  'Umber',
  'Valley',
  'Willow',
  'Zephyr',
  'Badger',
  'Cypress',
  'Drifter',
  'Foxglove',
];

/** How many candidates are drawn before the generator gives up. */
const MAX_ATTEMPTS = 32;

function pick(words: readonly string[]): string {
  return words[randomInt(words.length)] as string;
}

function readableCandidate(): string {
  return `${pick(LEADING_WORDS)}-${pick(TRAILING_WORDS)}-${randomInt(1000, 10000)}`;
}

function randomCandidate(): string {
  return `Temp-${randomBytes(16).toString('base64url')}`;
}

/**
 * Draws the one-time password handed to HRD when an account is created or a
 * password is reset.
 *
 * There is exactly one rule for whether a password may be stored: the shared
 * strength check every password-setting path runs (length, no control
 * characters, not on the breached list). This function therefore contains no
 * strength rule of its own — it only draws candidates and keeps the first one
 * that rule accepts, which is why the value it returns can be handed straight
 * to the same check afterwards and still be accepted. The final candidate is
 * built from random bytes, so drawing is guaranteed to terminate even if a
 * word pair ever collided with an entry on the breached list.
 */
export function generateTemporaryPassword(): string {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate =
      attempt < MAX_ATTEMPTS - 1 ? readableCandidate() : randomCandidate();
    if (findPasswordProblem(candidate) === null) {
      return candidate;
    }
  }
  throw new Error('no password candidate satisfied the shared password rule');
}
