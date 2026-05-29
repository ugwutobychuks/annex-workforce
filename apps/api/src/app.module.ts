import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CandidatesModule } from './candidates/candidates.module';
import { EmployersModule } from './employers/employers.module';
import { JobsModule } from './jobs/jobs.module';
import { ApplicationsModule } from './applications/applications.module';
import { EorModule } from './eor/eor.module';
import { PayrollModule } from './payroll/payroll.module';
import { HrmsModule } from './hrms/hrms.module';

import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),

    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 5 },
      { name: 'medium', ttl: 60_000, limit: 60 },
      { name: 'long', ttl: 3_600_000, limit: 1000 },
    ]),

    TerminusModule,

    // ─── Infrastructure modules ────────────────────────────
    PrismaModule,
    RedisModule,
    StorageModule,
    SearchModule,
    NotificationsModule,

    // ─── Domain modules ─────────────────────────────────────
    AuthModule,
    UsersModule,
    CandidatesModule,
    EmployersModule,
    JobsModule,
    ApplicationsModule,
    EorModule,
    PayrollModule,
    HrmsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
