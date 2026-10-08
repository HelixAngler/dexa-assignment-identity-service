import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { config } from '../config';
import { PrismaClient } from '../generated/prisma';

/**
 * The application's single database connection pool.
 *
 * The connection string comes from the primary-database setting, which keeps
 * the client working whether the deployment exports it under its own name or
 * under the generic one; when neither is set the generated client falls back to
 * reading the environment itself. The pool is closed together with the
 * application so tests and short-lived processes do not leak connections.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super(
      config.databaseUrlMain
        ? { datasourceUrl: config.databaseUrlMain }
        : undefined,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
