export type AttributeType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'text'
  | 'decimal'
  | 'uuid'
  | 'email'
  | 'phone'
  | 'unknown';

export type Cardinality = '1:1' | '1:N' | 'N:N';

export type EntityKind = 'regular' | 'weak' | 'associative';

export type AttributeKind = 'simple' | 'identifier' | 'multivalued' | 'composite' | 'derived' | 'subattribute';

export type ElementKind =
  | 'entity'
  | 'weak-entity'
  | 'associative-entity'
  | 'simple-attribute'
  | 'multivalued-attribute'
  | 'composite-attribute'
  | 'derived-attribute'
  | 'identifier-attribute'
  | 'subattribute'
  | 'relationship'
  | 'identifying-relationship'
  | 'one-to-one'
  | 'one-to-many'
  | 'many-to-many'
  | 'generalization'
  | 'specialization'
  | 'generalization-specialization';

export type Attribute = {
  id: string;
  name: string;
  type: AttributeType;
  description?: string;
  identifier: boolean;
  required: boolean;
  unique: boolean;
  multivalued: boolean;
  composite: boolean;
  derived: boolean;
  components: Array<{
    id: string;
    name: string;
    type: AttributeType;
  }>;
  kind?: AttributeKind;
  parentAttributeId?: string;
  connectionHandle?: string;
  entityHandle?: string;
  parentHandle?: string;
  parentAttributeHandle?: string;
};

export type Entity = {
  id: string;
  name: string;
  description?: string;
  kind?: EntityKind;
  attributes: Attribute[];
};

export type RelationshipParticipant = {
  entityId: string;
  role?: string;
  cardinality: '1' | 'N';
  connectionHandle?: string;
  entityHandle?: string;
  connectionDirection?: 'entity-to-relationship' | 'relationship-to-entity';
};

export type Relationship = {
  id: string;
  name: string;
  description?: string;
  type: Cardinality;
  kind?: 'relationship' | 'identifying-relationship' | 'generalization' | 'specialization';
  participants: RelationshipParticipant[];
  attributes: Attribute[];
};

export type Ambiguity = {
  id: string;
  message: string;
  field?: string;
  suggestions: string[];
};

export type ConceptualModel = {
  metadata: {
    title?: string;
    description?: string;
    sourceText?: string;
    generatedBy?: string;
    generatedAt?: string;
  };
  entities: Entity[];
  standaloneAttributes?: Attribute[];
  relationships: Relationship[];
  ambiguities: Ambiguity[];
};
