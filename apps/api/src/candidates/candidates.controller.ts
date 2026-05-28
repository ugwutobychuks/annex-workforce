import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CandidatesService } from './candidates.service';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { SearchCandidatesDto } from './dto/search-candidates.dto';
import { AddSkillDto, AddExperienceDto, AddEducationDto } from './dto/profile-items.dto';

@ApiTags('candidates')
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my candidate profile' })
  @UseGuards(JwtAuthGuard)
  myProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.candidatesService.getProfile(user.id);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my profile' })
  @UseGuards(JwtAuthGuard)
  updateMyProfile(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateCandidateDto) {
    return this.candidatesService.updateProfile(user.id, dto);
  }

  @Post('me/skills')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addSkill(@CurrentUser() user: CurrentUserPayload, @Body() dto: AddSkillDto) {
    return this.candidatesService.addSkill(user.id, dto);
  }

  @Delete('me/skills/:skillId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  removeSkill(@CurrentUser() user: CurrentUserPayload, @Param('skillId', ParseUUIDPipe) skillId: string) {
    return this.candidatesService.removeSkill(user.id, skillId);
  }

  @Post('me/experience')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addExperience(@CurrentUser() user: CurrentUserPayload, @Body() dto: AddExperienceDto) {
    return this.candidatesService.addExperience(user.id, dto);
  }

  @Post('me/education')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addEducation(@CurrentUser() user: CurrentUserPayload, @Body() dto: AddEducationDto) {
    return this.candidatesService.addEducation(user.id, dto);
  }

  @Post('me/resume')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadResume(@CurrentUser() user: CurrentUserPayload, @UploadedFile() file: Express.Multer.File) {
    return this.candidatesService.uploadResume(user.id, file);
  }

  @Get('search')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search talent pool (employers)' })
  @UseGuards(JwtAuthGuard)
  search(@CurrentUser() user: CurrentUserPayload, @Query() filters: SearchCandidatesDto) {
    return this.candidatesService.searchCandidates(filters, user.role);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get candidate by id (employers/admins)' })
  @UseGuards(JwtAuthGuard)
  byId(@Param('id', ParseUUIDPipe) id: string) {
    return this.candidatesService.getById(id);
  }
}
