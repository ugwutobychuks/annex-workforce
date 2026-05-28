// ─── hrms.module.ts ───────────────────────────────────────────
import { Module } from '@nestjs/common';
import { HrmsService } from './hrms.service';
import { HrmsController } from './hrms.controller';
import { EmployersModule } from '../employers/employers.module';

@Module({
  imports: [EmployersModule],
  providers: [HrmsService],
  controllers: [HrmsController],
})
export class HrmsModule {}
