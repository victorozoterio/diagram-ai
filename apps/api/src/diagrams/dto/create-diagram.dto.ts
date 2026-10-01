import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

export class CreateDiagramDto {
  @ApiProperty({ example: 'Modelo conceitual' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ description: 'Documento versionado no formato .diagramai' })
  @IsObject()
  content!: Record<string, unknown>;
}
