// ─── eor.module.ts ────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { EorService } from './eor.service';
import { EorController } from './eor.controller';
import { EmployersModule } from '../employers/employers.module';

@Module({
  imports: [EmployersModule],
  providers: [EorService],
  controllers: [EorController],
})
export class EorModule {}
