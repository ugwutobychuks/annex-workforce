import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateEmployerDto {
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() size?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hqCountry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hqCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rcNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
}

export class UpdateEmployerDto extends PartialType(CreateEmployerDto) {}
