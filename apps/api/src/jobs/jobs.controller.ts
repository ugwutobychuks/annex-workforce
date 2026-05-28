import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload, Public } from '../common/decorators/current-user.decorator';
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobDto, SearchJobsDto } from './dto/job.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Public job search' })
  search(@Query() filters: SearchJobsDto) {
    return this.jobsService.publicSearch(filters);
  }

  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my employer jobs' })
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: CurrentUserPayload) {
    return this.jobsService.listEmployerJobs(user.id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get job by id' })
  byId(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.byId(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new job (employers)' })
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateJobDto) {
    return this.jobsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(user.id, id, dto);
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  publish(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.publish(user.id, id);
  }

  @Post(':id/close')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  close(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.close(user.id, id);
  }
}
