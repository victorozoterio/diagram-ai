import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class CardinalityParticipantDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  entity: string;

  @IsIn(['1', 'N'])
  @ApiProperty({ enum: ['1', 'N'] })
  cardinality: '1' | 'N';
}

class CardinalityClarificationDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => CardinalityParticipantDto)
  @ApiProperty({ type: [CardinalityParticipantDto], minItems: 2, maxItems: 2 })
  participants: CardinalityParticipantDto[];
}

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

  @IsOptional()
  @ValidateNested()
  @Type(() => CardinalityClarificationDto)
  @ApiProperty({ type: CardinalityClarificationDto, required: false })
  cardinality?: CardinalityClarificationDto;
}
