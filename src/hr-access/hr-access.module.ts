import { Module } from '@nestjs/common';
import { HrAccessController } from './hr-access.controller';
import { HrAccessRepository } from './hr-access.repository';
import { HrAccessService } from './hr-access.service';

/**
 * Maker-checker approvals for HR accounts: an HR maker files a proposal, a
 * different HR checker approves it — minting the account and revealing its
 * one-time password — or rejects it, and the maker may withdraw while it is
 * still pending.
 *
 * The module declares only its own controller, service and repository.
 * Everything else it needs — the database pool, the session store and the
 * employee-creation path — comes from the application root, which is marked
 * `@Global` and exports those tokens, so this feature shares the app's
 * singletons instead of quietly opening a second connection pool.
 */
@Module({
  controllers: [HrAccessController],
  providers: [HrAccessService, HrAccessRepository],
})
export class HrAccessModule {}
