import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ClarificationAnswerDto } from './clarification-answer.dto';

export class GenerateDiagramDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  @ApiProperty()
  description: string;

  @IsOptional()
  @IsIn(['conceptual', 'logical'])
  @ApiProperty({ enum: ['conceptual', 'logical'], required: false, default: 'conceptual' })
  mode?: 'conceptual' | 'logical';

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ClarificationAnswerDto)
  @ApiProperty({ type: [ClarificationAnswerDto], required: false })
  clarifications?: ClarificationAnswerDto[];
}
