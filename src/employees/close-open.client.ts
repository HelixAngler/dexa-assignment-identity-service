import { Injectable, Logger } from '@nestjs/common';
import { attendanceInternalSettings } from '../config';

/** Internal path that closes the open session of one employee. */
export const CLOSE_OPEN_PATH = '/api/attendance/internal/sessions/close-open';

/** Header the shared service-to-service secret travels on. */
export const INTERNAL_TOKEN_HEADER = 'x-internal-token';

/** Wall-clock budget for a single attempt, so a hung peer cannot stall us. */
export const ATTEMPT_TIMEOUT_MS = 2_000;

/** Attempts made after the first one while the peer keeps failing. */
export const MAX_RETRIES = 3;

/** Delay before the first retry; every following delay doubles it. */
export const INITIAL_BACKOFF_MS = 100;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Best-effort caller of the attendance service's close-open endpoint.
 *
 * Used when an employee is deactivated: any session they left open should be
 * closed with a system marker at that moment. The call is deliberately built
 * to be unbreakable from the caller's point of view — each attempt runs
 * against its own timeout, a failed attempt is repeated after a doubling
 * delay, and exhausting every attempt logs an error and resolves normally.
 * A deactivation must land even when the attendance service is unreachable,
 * because the row change and the session revocation have already happened and
 * the midnight job backstops a session the notification never reached.
 *
 * Settings are read at call time so a test can point the client at a local
 * stand-in (or at a closed port) without rebuilding the application.
 */
@Injectable()
export class CloseOpenClient {
  private readonly logger = new Logger(CloseOpenClient.name);

  async notifyEmployeeDeactivated(employeeId: string): Promise<void> {
    const { baseUrl, token } = attendanceInternalSettings();
    const url = `${baseUrl}${CLOSE_OPEN_PATH}`;
    let lastProblem = 'no attempt was made';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      if (attempt > 0) {
        await sleep(INITIAL_BACKOFF_MS * 2 ** (attempt - 1));
      }
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [INTERNAL_TOKEN_HEADER]: token,
          },
          body: JSON.stringify({ employeeId }),
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        });
        // Draining keeps the connection reusable for the next attempt.
        await response.arrayBuffer().catch(() => undefined);
        if (response.ok) {
          return;
        }
        lastProblem = `answered HTTP ${response.status}`;
      } catch (error: unknown) {
        lastProblem = error instanceof Error ? error.message : String(error);
      }
    }

    this.logger.error(
      `closing the open session of employee ${employeeId} failed after ` +
        `${MAX_RETRIES + 1} attempts: ${lastProblem}`,
    );
  }
}
