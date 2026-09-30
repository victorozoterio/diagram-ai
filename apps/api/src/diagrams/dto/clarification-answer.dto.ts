import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

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
}
