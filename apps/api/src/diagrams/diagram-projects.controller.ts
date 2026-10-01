import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CreateDiagramDto } from './dto/create-diagram.dto';
import { UpdateDiagramDto } from './dto/update-diagram.dto';
import { DiagramProjectsService } from './services/diagram-projects.service';

@ApiTags('Diagrams')
@ApiCookieAuth('better-auth.session_token')
@UseGuards(SessionAuthGuard)
@Controller('diagrams/projects')
export class DiagramProjectsController {
  constructor(private readonly projectsService: DiagramProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um diagrama para o usuário autenticado' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDiagramDto) {
    return this.projectsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os diagramas do usuário autenticado' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um diagrama do usuário autenticado' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projectsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um diagrama do usuário autenticado' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDiagramDto) {
    return this.projectsService.update(user.id, id, dto);
  }
}
