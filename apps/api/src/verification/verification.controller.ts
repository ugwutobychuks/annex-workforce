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
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { VerificationService } from './verification.service';
import { InitiateVerificationDto, RejectVerificationDto } from './dto/verification.dto';

@ApiTags('verification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Start a verification check on the current candidate' })
  initiate(@CurrentUser() user: CurrentUserPayload, @Body() dto: InitiateVerificationDto) {
    return this.verificationService.initiate(user.id, dto);
  }

  @Get('mine')
  mine(@CurrentUser() user: CurrentUserPayload) {
    return this.verificationService.listForCandidate(user.id);
  }

  @Get('admin/queue')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin verification queue' })
  queue(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.verificationService.adminList({
      status,
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
    });
  }

  @Post('admin/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  approve(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.verificationService.manualApprove(id, user.id);
  }

  @Post('admin/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  reject(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectVerificationDto,
  ) {
    return this.verificationService.manualReject(id, user.id, dto.reason);
  }
}
