import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, IsUrl, MaxLength } from 'class-validator';

export class ApplyDto {
  @ApiProperty()
  @IsUUID()
  jobId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  coverLetter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  resumeUrl?: string;
}

const STATUSES = [
  'APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW',
  'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN',
] as const;

export class UpdateApplicationStatusDto {
  @ApiProperty({ enum: STATUSES })
  @IsIn(STATUSES as unknown as string[])
  status!: typeof STATUSES[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
