export interface AppConfig {
  port: number;
  databaseUrl: string;
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
  redisUrl: str(process.env.REDIS_URL, 'redis://localhost:6379'),
  nodeEnv: str(process.env.NODE_ENV, 'development'),
};
