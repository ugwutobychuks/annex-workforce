import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class CreatePayrollRunDto {
  @ApiProperty({ example: '2025-05', description: 'YYYY-MM' })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Period must be YYYY-MM' })
  period!: string;
}
