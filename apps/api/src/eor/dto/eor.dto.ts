import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateEorContractDto {
  @ApiProperty()
  @IsUUID()
  candidateUserId!: string;

  @ApiProperty()
  @IsString()
  jobTitle!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  monthlySalary!: number;

  @ApiPropertyOptional({ default: 'NGN' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  probationMonths?: number;

  @ApiPropertyOptional({ description: 'Defaults to 8% of salary, min ₦50k' })
  @IsOptional()
  @IsNumber()
  managementFee?: number;
}

export class UpdateEorContractDto extends PartialType(CreateEorContractDto) {
  @ApiPropertyOptional({ enum: ['PENDING', 'ACTIVE', 'TERMINATED', 'EXPIRED'] })
  @IsOptional()
  @IsIn(['PENDING', 'ACTIVE', 'TERMINATED', 'EXPIRED'])
  status?: string;
}
