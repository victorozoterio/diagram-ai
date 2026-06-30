import { Body, Controller, Post } from '@nestjs/common';
import { DiagramsService } from './diagrams.service';
import { GenerateDiagramDto } from './dto/generate-diagram.dto';

@Controller('diagrams')
export class DiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Post('generate')
  generate(@Body() dto: GenerateDiagramDto) {
    return this.diagramsService.generate(dto);
  }
}
