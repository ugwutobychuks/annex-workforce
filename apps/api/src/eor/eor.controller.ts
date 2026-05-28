// ─── eor.controller.ts ────────────────────────────────────────
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
import { EorService } from './eor.service';
import { CreateEorContractDto, UpdateEorContractDto } from './dto/eor.dto';

@ApiTags('eor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('eor')
export class EorController {
  constructor(private readonly eorService: EorService) {}

  @Post('contracts')
  @ApiOperation({ summary: 'Create EOR contract (employer)' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateEorContractDto) {
    return this.eorService.create(user.id, dto);
  }

  @Get('contracts')
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.eorService.listForEmployer(user.id);
  }

  @Get('contracts/mine')
  @ApiOperation({ summary: 'Contracts where I am the employee' })
  mine(@CurrentUser() user: CurrentUserPayload) {
    return this.eorService.myContracts(user.id);
  }

  @Get('contracts/:id')
  byId(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.eorService.byId(user.id, id);
  }

  @Patch('contracts/:id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEorContractDto,
  ) {
    return this.eorService.update(user.id, id, dto);
  }

  @Post('contracts/:id/activate')
  activate(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.eorService.activate(user.id, id);
  }

  @Post('contracts/:id/terminate')
  terminate(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.eorService.terminate(user.id, id);
  }
}
