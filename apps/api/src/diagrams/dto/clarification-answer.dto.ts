import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ClarificationAnswerDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  questionId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ApiProperty({ type: [String] })
  answers: string[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  questionText?: string;

  @IsOptional()
  @IsIn(['cardinality', 'structural'])
  @ApiProperty({ enum: ['cardinality', 'structural'], required: false })
  kind?: 'cardinality' | 'structural';
}
