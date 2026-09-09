import type { Dispatch, SetStateAction } from 'react';
import type { ConceptualModel, LogicalModel } from '../../types';

export type DiagramPosition = { x: number; y: number };
export type DiagramSize = { width: number; height: number };
export type EdgeControlPoints = {
  controlPoint1: DiagramPosition;
  controlPoint2: DiagramPosition;
};

export type AttributeSelection = {
  entityId: string | null;
  attributeId: string;
} | null;

export type StateSetter<T> = Dispatch<SetStateAction<T>>;

export type ConceptualModelState = {
  conceptualModel: ConceptualModel | null;
  setConceptualModel: StateSetter<ConceptualModel | null>;
  setLogicalModel: StateSetter<LogicalModel | null>;
};
