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
};

export type Entity = {
  id: string;
  name: string;
  description?: string;
  attributes: Attribute[];
};

export type RelationshipParticipant = {
  entityId: string;
  role?: string;
  cardinality: '1' | 'N';
};

export type Relationship = {
  id: string;
  name: string;
  description?: string;
  type: Cardinality;
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
  relationships: Relationship[];
  ambiguities: Ambiguity[];
};
