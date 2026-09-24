import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
