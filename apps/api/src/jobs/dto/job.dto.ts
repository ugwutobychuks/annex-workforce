import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateJobDto {
  @ApiProperty() @IsString() @MaxLength(200) title!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() responsibilities?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() requirements?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() benefits?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;

  @ApiPropertyOptional({ enum: ['REMOTE', 'HYBRID', 'ONSITE'] })
  @IsOptional() @IsIn(['REMOTE', 'HYBRID', 'ONSITE'])
  workArrangement?: string;

  @ApiPropertyOptional({ enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'] })
  @IsOptional() @IsIn(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'])
  employmentType?: string;

  @ApiPropertyOptional({ enum: ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL', 'EXECUTIVE'] })
  @IsOptional() @IsIn(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL', 'EXECUTIVE'])
  seniority?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() salaryMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() salaryMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() salaryCurrency?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isEor?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  skillNames?: string[];
}

export class UpdateJobDto extends PartialType(CreateJobDto) {}

export class SearchJobsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;

  @ApiPropertyOptional({ enum: ['REMOTE', 'HYBRID', 'ONSITE'] })
  @IsOptional() @IsIn(['REMOTE', 'HYBRID', 'ONSITE'])
  workArrangement?: string;

  @ApiPropertyOptional({ enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'] })
  @IsOptional() @IsIn(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'])
  employmentType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() seniority?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value?.split(',')))
  @IsArray()
  skills?: string[];

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() minSalary?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
