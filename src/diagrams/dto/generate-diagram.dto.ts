import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GenerateDiagramDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description: string;
}
