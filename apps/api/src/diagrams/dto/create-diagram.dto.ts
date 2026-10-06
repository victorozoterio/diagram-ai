import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDiagramDto {
  @ApiProperty({ example: 'Diagrama 1', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @ApiProperty({ description: 'Documento versionado no formato .diagramai' })
  @IsObject()
  content!: Record<string, unknown>;
}
