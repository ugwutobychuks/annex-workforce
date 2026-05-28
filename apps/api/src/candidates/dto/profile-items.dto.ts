// ─── profile-items.dto.ts ─────────────────────────────────────
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AddSkillDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional() @IsInt() @Min(1) @Max(5) level?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) yearsExp?: number;
}

export class AddExperienceDto {
  @ApiProperty() @IsString() company!: string;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsDateString() startDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCurrent?: boolean;
}

export class AddEducationDto {
  @ApiProperty() @IsString() institution!: string;
  @ApiProperty() @IsString() degree!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fieldOfStudy?: string;
  @ApiProperty() @IsInt() startYear!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() endYear?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() grade?: string;
}
