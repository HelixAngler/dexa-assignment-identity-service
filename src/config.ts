export interface AppConfig {
  port: number;
  databaseUrl: string;
  /**
   * URL of the primary domain database. Deployments name it
   * `DATABASE_URL_MAIN`; the older/compose `DATABASE_URL` name is accepted as a
   * fallback so either environment works without extra wiring.
   */
  databaseUrlMain: string;
  redisUrl: string;
  nodeEnv: string;
}

export function num(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function str(raw: string | undefined, fallback: string): string {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  return raw;
}

export const config: AppConfig = {
  port: num(process.env.PORT, 3001),
  databaseUrl: str(process.env.DATABASE_URL, ''),
  databaseUrlMain: str(
    process.env.DATABASE_URL_MAIN ?? process.env.DATABASE_URL,
    '',
  ),
  redisUrl: str(process.env.REDIS_URL, 'redis://localhost:6379'),
  nodeEnv: str(process.env.NODE_ENV, 'development'),
};
