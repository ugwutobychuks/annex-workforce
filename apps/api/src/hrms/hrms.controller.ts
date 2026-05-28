import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { HrmsService } from './hrms.service';
import { CreateLeaveDto, DecideLeaveDto } from './dto/hrms.dto';

@ApiTags('hrms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hrms')
export class HrmsController {
  constructor(private readonly hrmsService: HrmsService) {}

  @Post('leave')
  @ApiOperation({ summary: 'Request time off' })
  request(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateLeaveDto) {
    return this.hrmsService.requestLeave(user.id, dto);
  }

  @Get('leave/mine')
  myLeave(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmsService.myLeave(user.id);
  }

  @Get('leave/balances')
  myBalances(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmsService.myBalances(user.id);
  }

  @Get('leave/pending')
  @ApiOperation({ summary: 'Pending requests for HR/manager approval' })
  pending(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmsService.pendingForEmployer(user.id);
  }

  @Get('leave')
  @ApiOperation({ summary: 'All leave (employer view)' })
  all(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmsService.allLeaveForEmployer(user.id);
  }

  @Patch('leave/:id/decision')
  decide(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideLeaveDto,
  ) {
    return this.hrmsService.decide(user.id, id, dto);
  }

  @Post('leave/:id/cancel')
  cancel(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.hrmsService.cancelLeave(user.id, id);
  }
}
