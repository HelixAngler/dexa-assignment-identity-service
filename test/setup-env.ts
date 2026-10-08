/**
 * Defaults every suite runs with when the surrounding shell provides nothing,
 * so `npm test` works against a freshly started local stack. Values already
 * present in the environment always win, which is what lets a suite be pointed
 * at another database or cache with a single export.
 */
process.env.DATABASE_URL_MAIN ??=
  'postgres://wfh:wfh@localhost:5432/wfh_main';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.ATTENDANCE_INTERNAL_URL ??= 'http://localhost:3002';
process.env.INTERNAL_API_TOKEN ??= 'test-internal-token';
