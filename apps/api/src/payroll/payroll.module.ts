// ─── payroll.module.ts ────────────────────────────────────────
import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { TaxEngineService } from './tax-engine.service';
import { EmployersModule } from '../employers/employers.module';

@Module({
  imports: [EmployersModule],
  providers: [PayrollService, TaxEngineService],
  controllers: [PayrollController],
})
export class PayrollModule {}
