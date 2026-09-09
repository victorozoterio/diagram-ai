import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { ConceptualModel } from '../../types';
import type { DiagramPosition } from './editor.types';

const elk = new ELK();

const NODE_SIZES = {
  entity: { width: 170, height: 64 },
  attribute: { width: 132, height: 68 },
  relationship: { width: 112, height: 112 },
  generalization: { width: 102, height: 86 },
};

const ATTRIBUTE_FAN = {
  entityGap: 70,
  columnGap: 150,
  verticalGap: 82,
  diagonalOffset: 40,
};

export type ConceptualLayout = {
  entityPositions: Record<string, DiagramPosition>;
  elementPositions: Record<string, DiagramPosition>;
};

export async function calculateInitialConceptualLayout(model: ConceptualModel): Promise<ConceptualLayout> {
  const graph: ElkNode = {
    id: 'conceptual-model',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.padding': '[top=60,left=60,bottom=60,right=60]',
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.nodeNodeBetweenLayers': '155',
      'elk.layered.spacing.edgeNodeBetweenLayers': '50',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: [
      ...model.entities.map((entity) => ({
        id: entity.id,
        ...NODE_SIZES.entity,
      })),
      ...model.entities.flatMap((entity) =>
        entity.attributes.map((attribute) => ({
          id: `${entity.id}:${attribute.id}`,
          ...NODE_SIZES.attribute,
        })),
      ),
      ...(model.standaloneAttributes ?? []).map((attribute) => ({
        id: `standalone:${attribute.id}`,
        ...NODE_SIZES.attribute,
      })),
      ...model.relationships.map((relationship) => ({
        id: `relationship:${relationship.id}`,
        ...(relationship.kind === 'generalization' || relationship.kind === 'specialization'
          ? NODE_SIZES.generalization
          : NODE_SIZES.relationship),
      })),
    ],
    edges: [
      ...model.entities.flatMap((entity) =>
        entity.attributes.map((attribute) => ({
          id: `attribute:${entity.id}:${attribute.id}`,
          sources: [entity.id],
          targets: [`${entity.id}:${attribute.id}`],
        })),
      ),
      ...model.relationships.flatMap((relationship) =>
        relationship.participants.map((participant, index) => ({
          id: `${relationship.id}:${participant.entityId}`,
          sources: [index === 0 ? participant.entityId : `relationship:${relationship.id}`],
          targets: [index === 0 ? `relationship:${relationship.id}` : participant.entityId],
        })),
      ),
    ],
  };

  const layout = await elk.layout(graph);
  const entityPositions: Record<string, DiagramPosition> = {};
  const elementPositions: Record<string, DiagramPosition> = {};

  for (const node of layout.children ?? []) {
    const position = { x: node.x ?? 0, y: node.y ?? 0 };
    if (model.entities.some((entity) => entity.id === node.id)) {
      entityPositions[node.id] = position;
    } else {
      elementPositions[node.id] = position;
    }
  }

  for (const entity of model.entities) {
    const entityPosition = entityPositions[entity.id];
    if (!entityPosition || entity.attributes.length === 0) {
      continue;
    }

    // Duas colunas compactas acima da entidade formam um leque triangular
    // sem ocupar a faixa lateral normalmente usada pelos relacionamentos.
    const firstColumnCount = Math.ceil(entity.attributes.length / 2);
    const secondColumnCount = entity.attributes.length - firstColumnCount;
    const fanWidth =
      secondColumnCount > 0 ? NODE_SIZES.attribute.width + ATTRIBUTE_FAN.columnGap : NODE_SIZES.attribute.width;
    const fanStartX = entityPosition.x + (NODE_SIZES.entity.width - fanWidth) / 2;
    const baseY = entityPosition.y - ATTRIBUTE_FAN.entityGap - NODE_SIZES.attribute.height;

    entity.attributes.forEach((attribute, index) => {
      const isFirstColumn = index < firstColumnCount;
      const columnIndex = isFirstColumn ? 0 : 1;
      const rowIndex = isFirstColumn ? index : index - firstColumnCount;
      const columnCount = isFirstColumn ? firstColumnCount : secondColumnCount;
      const columnOffset = columnCount === 1 && entity.attributes.length > 1 ? -ATTRIBUTE_FAN.diagonalOffset : 0;

      elementPositions[`${entity.id}:${attribute.id}`] = {
        x: fanStartX + columnIndex * ATTRIBUTE_FAN.columnGap,
        y: baseY + columnOffset - (columnCount - 1 - rowIndex) * ATTRIBUTE_FAN.verticalGap,
      };
    });
  }

  const occupiedBoxes = [
    ...model.entities.map((entity) => ({
      ...entityPositions[entity.id],
      ...NODE_SIZES.entity,
    })),
    ...model.relationships.map((relationship) => ({
      ...elementPositions[`relationship:${relationship.id}`],
      ...(relationship.kind === 'generalization' || relationship.kind === 'specialization'
        ? NODE_SIZES.generalization
        : NODE_SIZES.relationship),
    })),
    ...model.entities.flatMap((entity) =>
      entity.attributes.map((attribute) => ({
        ...elementPositions[`${entity.id}:${attribute.id}`],
        ...NODE_SIZES.attribute,
      })),
    ),
  ];
  const componentBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];

  for (const entity of model.entities) {
    for (const attribute of entity.attributes.filter((item) => item.components.length > 0)) {
      const parentPosition = elementPositions[`${entity.id}:${attribute.id}`];
      const entityPosition = entityPositions[entity.id];
      const parentIsOnRight =
        parentPosition.x + NODE_SIZES.attribute.width / 2 >= entityPosition.x + NODE_SIZES.entity.width / 2;
      const direction = parentIsOnRight ? 1 : -1;
      const centerY = parentPosition.y + NODE_SIZES.attribute.height / 2;

      const getPositions = (distance: number) =>
        attribute.components.map((_component, componentIndex) => {
          const offset = componentIndex - (attribute.components.length - 1) / 2;
          return {
            x: parentPosition.x + direction * (NODE_SIZES.attribute.width + 28 + distance + Math.abs(offset) * 34),
            y: centerY - NODE_SIZES.attribute.height / 2 + offset * 76,
            width: NODE_SIZES.attribute.width,
            height: NODE_SIZES.attribute.height,
          };
        });

      const localVerticalOffsets = [0, -96, 96, -192, 192, -288, 288];
      const candidates = localVerticalOffsets.map((verticalOffset) =>
        getPositions(0).map((box) => ({ ...box, y: box.y + verticalOffset })),
      );
      const positions =
        candidates.find((candidate) =>
          candidate.every((box) => ![...occupiedBoxes, ...componentBoxes].some((other) => boxesOverlap(box, other))),
        ) ?? candidates[0];

      positions.forEach((box, componentIndex) => {
        const component = attribute.components[componentIndex];
        elementPositions[`${entity.id}:${component.id}`] = { x: box.x, y: box.y };
        componentBoxes.push(box);
      });
    }
  }

  for (const relationship of model.relationships) {
    const relationshipPosition = elementPositions[`relationship:${relationship.id}`];
    if (!relationshipPosition) continue;

    relationship.attributes.forEach((attribute, index) => {
      elementPositions[`relationship-attribute:${relationship.id}:${attribute.id}`] = {
        x: relationshipPosition.x + index * 150,
        y: relationshipPosition.y + NODE_SIZES.relationship.height + 70,
      };
    });
  }

  return { entityPositions, elementPositions };
}

function boxesOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) {
  const gap = 18;
  return !(
    first.x + first.width + gap <= second.x ||
    second.x + second.width + gap <= first.x ||
    first.y + first.height + gap <= second.y ||
    second.y + second.height + gap <= first.y
  );
}
