import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

const TYPES = ['IDENTITY', 'EDUCATION', 'EMPLOYMENT', 'BACKGROUND'] as const;
const PROVIDERS = ['smile_identity', 'youverify', 'manual'] as const;

export class InitiateVerificationDto {
  @ApiProperty({ enum: TYPES })
  @IsIn(TYPES as unknown as string[])
  type!: typeof TYPES[number];

  @ApiPropertyOptional({ enum: PROVIDERS })
  @IsOptional()
  @IsIn(PROVIDERS as unknown as string[])
  provider?: typeof PROVIDERS[number];

  @ApiPropertyOptional({ description: 'Provider-specific metadata (NIN, BVN, doc URLs)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class RejectVerificationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}
