// ─── applications.module.ts ───────────────────────────────────
import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { EmployersModule } from '../employers/employers.module';

@Module({
  imports: [EmployersModule],
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}
