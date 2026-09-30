import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AnalyzeAmbiguitiesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  @ApiProperty()
  description: string;
}
