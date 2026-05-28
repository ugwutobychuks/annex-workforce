import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PayrollService } from './payroll.service';
import { CreatePayrollRunDto } from './dto/payroll.dto';

@ApiTags('payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('runs')
  @ApiOperation({ summary: 'Create draft payroll run for a period (YYYY-MM)' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreatePayrollRunDto) {
    return this.payrollService.createRun(user.id, dto);
  }

  @Get('runs')
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.payrollService.listRuns(user.id);
  }

  @Get('runs/:id')
  byId(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.getRun(user.id, id);
  }

  @Post('runs/:id/approve')
  approve(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.approve(user.id, id);
  }

  @Post('runs/:id/process')
  process(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.process(user.id, id);
  }

  @Get('payslips/mine')
  @ApiOperation({ summary: 'Employee: view my payslips' })
  myPayslips(@CurrentUser() user: CurrentUserPayload) {
    return this.payrollService.myPayslips(user.id);
  }

  @Get('estimate')
  @ApiOperation({ summary: 'Estimate net salary, taxes, pension for a gross figure' })
  estimate(@Query('gross') gross: string) {
    return this.payrollService.estimate(parseFloat(gross));
  }
}
