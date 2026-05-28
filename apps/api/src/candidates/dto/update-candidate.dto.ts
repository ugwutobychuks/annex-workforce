import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCandidateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) headline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) summary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(60) yearsOfExperience?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() currentSalary?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() expectedSalary?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() salaryCurrency?: string;

  @ApiPropertyOptional({ enum: ['IMMEDIATELY', 'WITHIN_2_WEEKS', 'WITHIN_MONTH', 'PASSIVELY_LOOKING', 'NOT_LOOKING'] })
  @IsOptional()
  @IsIn(['IMMEDIATELY', 'WITHIN_2_WEEKS', 'WITHIN_MONTH', 'PASSIVELY_LOOKING', 'NOT_LOOKING'])
  availability?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() willingToRelocate?: boolean;

  @ApiPropertyOptional({ enum: ['REMOTE', 'HYBRID', 'ONSITE'] })
  @IsOptional()
  @IsIn(['REMOTE', 'HYBRID', 'ONSITE'])
  remotePreference?: string;

  @ApiPropertyOptional() @IsOptional() @IsUrl() linkedinUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() githubUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() portfolioUrl?: string;
}
