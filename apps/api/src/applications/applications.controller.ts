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
import { ApplicationsService } from './applications.service';
import { ApplyDto, UpdateApplicationStatusDto } from './dto/application.dto';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Apply to a job' })
  apply(@CurrentUser() user: CurrentUserPayload, @Body() dto: ApplyDto) {
    return this.applicationsService.apply(user.id, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List my applications (candidate)' })
  mine(@CurrentUser() user: CurrentUserPayload) {
    return this.applicationsService.myApplications(user.id);
  }

  @Post(':id/withdraw')
  withdraw(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.withdrawApplication(user.id, id);
  }

  @Get('job/:jobId')
  @ApiOperation({ summary: 'List applications for a job (employer)' })
  forJob(@CurrentUser() user: CurrentUserPayload, @Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.applicationsService.listForJob(user.id, jobId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update application status (employer)' })
  updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(user.id, id, dto);
  }

  @Get(':id')
  byId(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.byId(user.id, id);
  }
}
