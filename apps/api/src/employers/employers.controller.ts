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
import { EmployersService } from './employers.service';
import { CreateEmployerDto, UpdateEmployerDto } from './dto/employer.dto';

@ApiTags('employers')
@Controller('employers')
export class EmployersController {
  constructor(private readonly employersService: EmployersService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create my employer profile' })
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateEmployerDto) {
    return this.employersService.create(user.id, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my employer' })
  @UseGuards(JwtAuthGuard)
  myEmployer(@CurrentUser() user: CurrentUserPayload) {
    return this.employersService.myEmployer(user.id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployerDto,
  ) {
    return this.employersService.update(user.id, id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Public employer profile' })
  byId(@Param('id', ParseUUIDPipe) id: string) {
    return this.employersService.byId(id);
  }
}
