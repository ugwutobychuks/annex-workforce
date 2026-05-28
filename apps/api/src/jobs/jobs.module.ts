// ─── jobs.module.ts ───────────────────────────────────────────
import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { EmployersModule } from '../employers/employers.module';

@Module({
  imports: [EmployersModule],
  providers: [JobsService],
  controllers: [JobsController],
  exports: [JobsService],
})
export class JobsModule {}
