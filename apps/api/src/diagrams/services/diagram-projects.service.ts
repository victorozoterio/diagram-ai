import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateDiagramDto } from '../dto/create-diagram.dto';
import type { UpdateDiagramDto } from '../dto/update-diagram.dto';
import { nextAvailableDiagramName } from './diagram-name';

@Injectable()
export class DiagramProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateDiagramDto) {
    this.assertDiagramAiContent(dto.content);
    const name = dto.name === undefined ? await this.nextDefaultName(userId) : this.normalizedName(dto.name);

    return this.prisma.diagram.create({
      data: {
        name,
        content: dto.content as Prisma.InputJsonValue,
        userId,
      },
    });
  }

  list(userId: string) {
    return this.prisma.diagram
      .findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      .then((diagrams) => diagrams);
  }

  async findOne(userId: string, id: string) {
    const diagram = await this.prisma.diagram.findFirst({ where: { id, userId } });
    if (!diagram) throw new NotFoundException('Diagrama não encontrado.');
    return diagram;
  }

  async update(userId: string, id: string, dto: UpdateDiagramDto) {
    if (dto.content) this.assertDiagramAiContent(dto.content);

    await this.findOne(userId, id);
    return this.prisma.diagram.update({
      where: { id },
      data: {
        ...(dto.name === undefined ? {} : { name: this.normalizedName(dto.name) }),
        ...(dto.content === undefined ? {} : { content: dto.content as Prisma.InputJsonValue }),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.diagram.delete({ where: { id } });
  }

  private assertDiagramAiContent(content: Record<string, unknown>) {
    if (
      content.format !== 'diagram-ai' ||
      (content.version !== 1 && content.version !== 2) ||
      typeof content.exportedAt !== 'string' ||
      (content.version === 1 &&
        ((content.modelType !== 'conceptual' && content.modelType !== 'logical') ||
          !isRecord(content.semanticModel) ||
          !isRecord(content.visual))) ||
      (content.version === 2 &&
        ((content.lastSavedMode !== 'conceptual' && content.lastSavedMode !== 'logical') || !isRecord(content.models)))
    ) {
      throw new BadRequestException('O conteúdo deve ser um projeto Diagram.AI compatível.');
    }
  }

  private normalizedName(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) throw new BadRequestException('O nome do diagrama é obrigatório.');
    return normalizedName;
  }

  private async nextDefaultName(userId: string) {
    const diagrams = await this.prisma.diagram.findMany({
      where: { userId },
      select: { name: true },
    });

    return nextAvailableDiagramName(diagrams.map((diagram) => diagram.name));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
