import { ConceptualModelJsonSchema } from '../../diagrams/schemas/conceptual-model.schema';

type BuildConceptualModelPromptInput = {
  description: string;
  model: string;
};

export function buildConceptualModelPrompt({ description, model }: BuildConceptualModelPromptInput): string {
  return `
Você é um especialista em modelagem conceitual de banco de dados.

Sua tarefa é transformar a descrição do usuário em um modelo conceitual no formato JSON.

DESCRIÇÃO DO USUÁRIO:
${description}

REGRAS OBRIGATÓRIAS:
- Retorne apenas JSON válido.
- Não use markdown.
- Não use bloco de código.
- Não escreva explicações fora do JSON.
- Não use comentários.
- Todos os IDs devem estar em minúsculo, sem espaços e sem acentos.
- Use IDs descritivos, como "cliente", "pedido", "cliente_realiza_pedido".
- O campo "type" dos relacionamentos deve usar exatamente um destes valores: "1:1", "1:N" ou "N:N".
- O campo "cardinality" dos participantes deve usar exatamente "1" ou "N".
- Se a cardinalidade estiver ambígua, escolha a mais provável e registre a dúvida em "ambiguities".
- Se não souber o tipo de um atributo, use "unknown".
- Não invente entidades desnecessárias.
- Não invente atributos que não estejam explícitos ou fortemente implícitos na descrição.
- Se um atributo identificar uma entidade, marque "identifier": true.
- Se um atributo deve ser único, marque "unique": true.
- Se um atributo for obrigatório, marque "required": true.
- Se um atributo puder ter vários valores, marque "multivalued": true.
- Se um atributo for composto por partes menores, marque "composite": true e preencha "components".
- Se um atributo puder ser calculado a partir de outro, marque "derived": true.
- Atributos derivados normalmente não devem ser marcados como "required".
- Relacionamentos N:N podem possuir atributos próprios quando a descrição indicar dados da associação.
- O campo "metadata.generatedBy" deve ser "${model}".
- O campo "metadata.sourceText" deve conter a descrição original do usuário.

SCHEMA JSON QUE A RESPOSTA DEVE SEGUIR:
${JSON.stringify(ConceptualModelJsonSchema, null, 2)}

EXEMPLO 1 - RELACIONAMENTO 1:N:
Descrição:
Um cliente pode realizar vários pedidos. Cada pedido pertence a apenas um cliente. O cliente possui nome e email. O pedido possui data e valor total.

Resposta válida:
{
  "metadata": {
    "title": "Sistema de Pedidos",
    "description": "Modelo conceitual para controle de clientes e pedidos",
    "sourceText": "Um cliente pode realizar vários pedidos. Cada pedido pertence a apenas um cliente. O cliente possui nome e email. O pedido possui data e valor total.",
    "generatedBy": "${model}",
    "generatedAt": "2026-01-01T00:00:00.000Z"
  },
  "entities": [
    {
      "id": "cliente",
      "name": "Cliente",
      "description": "Pessoa que realiza pedidos no sistema",
      "attributes": [
        {
          "id": "cliente_nome",
          "name": "nome",
          "type": "string",
          "description": "Nome do cliente",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "cliente_email",
          "name": "email",
          "type": "email",
          "description": "E-mail do cliente",
          "identifier": false,
          "required": false,
          "unique": true,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        }
      ]
    },
    {
      "id": "pedido",
      "name": "Pedido",
      "description": "Pedido realizado por um cliente",
      "attributes": [
        {
          "id": "pedido_data",
          "name": "data",
          "type": "date",
          "description": "Data do pedido",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "pedido_valor_total",
          "name": "valorTotal",
          "type": "decimal",
          "description": "Valor total do pedido",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "cliente_realiza_pedido",
      "name": "realiza",
      "description": "Um cliente pode realizar vários pedidos e cada pedido pertence a apenas um cliente",
      "type": "1:N",
      "participants": [
        {
          "entityId": "cliente",
          "role": "cliente que realiza pedidos",
          "cardinality": "1"
        },
        {
          "entityId": "pedido",
          "role": "pedido realizado por um cliente",
          "cardinality": "N"
        }
      ],
      "attributes": []
    }
  ],
  "ambiguities": []
}

EXEMPLO 2 - RELACIONAMENTO N:N:
Descrição:
Alunos podem cursar várias disciplinas e disciplinas podem ter vários alunos. A matrícula possui data e situação.

Resposta válida:
{
  "metadata": {
    "title": "Sistema Acadêmico",
    "description": "Modelo conceitual para alunos, disciplinas e matrículas",
    "sourceText": "Alunos podem cursar várias disciplinas e disciplinas podem ter vários alunos. A matrícula possui data e situação.",
    "generatedBy": "${model}",
    "generatedAt": "2026-01-01T00:00:00.000Z"
  },
  "entities": [
    {
      "id": "aluno",
      "name": "Aluno",
      "description": "Pessoa matriculada em disciplinas",
      "attributes": []
    },
    {
      "id": "disciplina",
      "name": "Disciplina",
      "description": "Disciplina cursada pelos alunos",
      "attributes": []
    }
  ],
  "relationships": [
    {
      "id": "aluno_cursa_disciplina",
      "name": "cursa",
      "description": "Alunos podem cursar várias disciplinas e disciplinas podem ter vários alunos",
      "type": "N:N",
      "participants": [
        {
          "entityId": "aluno",
          "role": "aluno matriculado na disciplina",
          "cardinality": "N"
        },
        {
          "entityId": "disciplina",
          "role": "disciplina cursada pelo aluno",
          "cardinality": "N"
        }
      ],
      "attributes": [
        {
          "id": "matricula_data",
          "name": "dataMatricula",
          "type": "date",
          "description": "Data em que o aluno foi matriculado na disciplina",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "matricula_situacao",
          "name": "situacao",
          "type": "string",
          "description": "Situação da matrícula do aluno na disciplina",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        }
      ]
    }
  ],
  "ambiguities": []
}

EXEMPLO 3 - MODELO MAIS COMPLETO:
Descrição:
Uma universidade possui vários departamentos. Cada departamento pertence a apenas uma universidade. Cada departamento possui vários professores. Cada professor pertence a apenas um departamento. Cada professor possui um perfil profissional único. Um perfil profissional pertence a apenas um professor. Alunos podem cursar várias disciplinas e cada disciplina pode ser cursada por vários alunos. A matrícula possui data, nota final e situação. O aluno possui RA único, nome, email único, telefones, data de nascimento, idade calculada e endereço composto por rua, número, bairro, cidade e estado. A disciplina possui código único, nome e carga horária. O professor possui matrícula única, nome e email único.

Resposta válida:
{
  "metadata": {
    "title": "Sistema Universitário",
    "description": "Modelo conceitual para controle de universidades, departamentos, professores, perfis profissionais, alunos, disciplinas e matrículas",
    "sourceText": "Uma universidade possui vários departamentos. Cada departamento pertence a apenas uma universidade. Cada departamento possui vários professores. Cada professor pertence a apenas um departamento. Cada professor possui um perfil profissional único. Um perfil profissional pertence a apenas um professor. Alunos podem cursar várias disciplinas e cada disciplina pode ser cursada por vários alunos. A matrícula possui data, nota final e situação. O aluno possui RA único, nome, email único, telefones, data de nascimento, idade calculada e endereço composto por rua, número, bairro, cidade e estado. A disciplina possui código único, nome e carga horária. O professor possui matrícula única, nome e email único.",
    "generatedBy": "${model}",
    "generatedAt": "2026-01-01T00:00:00.000Z"
  },
  "entities": [
    {
      "id": "universidade",
      "name": "Universidade",
      "description": "Instituição de ensino superior",
      "attributes": [
        {
          "id": "universidade_nome",
          "name": "nome",
          "type": "string",
          "description": "Nome da universidade",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        }
      ]
    },
    {
      "id": "departamento",
      "name": "Departamento",
      "description": "Departamento vinculado a uma universidade",
      "attributes": [
        {
          "id": "departamento_nome",
          "name": "nome",
          "type": "string",
          "description": "Nome do departamento",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        }
      ]
    },
    {
      "id": "professor",
      "name": "Professor",
      "description": "Professor vinculado a um departamento",
      "attributes": [
        {
          "id": "professor_matricula",
          "name": "matricula",
          "type": "string",
          "description": "Matrícula única do professor",
          "identifier": true,
          "required": true,
          "unique": true,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "professor_nome",
          "name": "nome",
          "type": "string",
          "description": "Nome do professor",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "professor_email",
          "name": "email",
          "type": "email",
          "description": "E-mail único do professor",
          "identifier": false,
          "required": true,
          "unique": true,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        }
      ]
    },
    {
      "id": "perfil_profissional",
      "name": "PerfilProfissional",
      "description": "Perfil profissional associado a um único professor",
      "attributes": [
        {
          "id": "perfil_profissional_titulacao",
          "name": "titulacao",
          "type": "string",
          "description": "Titulação acadêmica do professor",
          "identifier": false,
          "required": false,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "perfil_profissional_curriculo_lattes",
          "name": "curriculoLattes",
          "type": "string",
          "description": "Endereço do currículo Lattes do professor",
          "identifier": false,
          "required": false,
          "unique": true,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        }
      ]
    },
    {
      "id": "aluno",
      "name": "Aluno",
      "description": "Aluno matriculado na universidade",
      "attributes": [
        {
          "id": "aluno_ra",
          "name": "ra",
          "type": "string",
          "description": "Registro acadêmico único do aluno",
          "identifier": true,
          "required": true,
          "unique": true,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "aluno_nome",
          "name": "nome",
          "type": "string",
          "description": "Nome do aluno",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "aluno_email",
          "name": "email",
          "type": "email",
          "description": "E-mail único do aluno",
          "identifier": false,
          "required": true,
          "unique": true,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "aluno_telefones",
          "name": "telefones",
          "type": "phone",
          "description": "Telefones do aluno",
          "identifier": false,
          "required": false,
          "unique": false,
          "multivalued": true,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "aluno_data_nascimento",
          "name": "dataNascimento",
          "type": "date",
          "description": "Data de nascimento do aluno",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "aluno_idade",
          "name": "idade",
          "type": "number",
          "description": "Idade calculada a partir da data de nascimento",
          "identifier": false,
          "required": false,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": true,
          "components": []
        },
        {
          "id": "aluno_endereco",
          "name": "endereco",
          "type": "text",
          "description": "Endereço composto do aluno",
          "identifier": false,
          "required": false,
          "unique": false,
          "multivalued": false,
          "composite": true,
          "derived": false,
          "components": [
            {
              "id": "aluno_endereco_rua",
              "name": "rua",
              "type": "string"
            },
            {
              "id": "aluno_endereco_numero",
              "name": "numero",
              "type": "string"
            },
            {
              "id": "aluno_endereco_bairro",
              "name": "bairro",
              "type": "string"
            },
            {
              "id": "aluno_endereco_cidade",
              "name": "cidade",
              "type": "string"
            },
            {
              "id": "aluno_endereco_estado",
              "name": "estado",
              "type": "string"
            }
          ]
        }
      ]
    },
    {
      "id": "disciplina",
      "name": "Disciplina",
      "description": "Disciplina cursada por alunos",
      "attributes": [
        {
          "id": "disciplina_codigo",
          "name": "codigo",
          "type": "string",
          "description": "Código único da disciplina",
          "identifier": true,
          "required": true,
          "unique": true,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "disciplina_nome",
          "name": "nome",
          "type": "string",
          "description": "Nome da disciplina",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "disciplina_carga_horaria",
          "name": "cargaHoraria",
          "type": "number",
          "description": "Carga horária da disciplina",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "universidade_possui_departamento",
      "name": "possui",
      "description": "Uma universidade possui vários departamentos e cada departamento pertence a apenas uma universidade",
      "type": "1:N",
      "participants": [
        {
          "entityId": "universidade",
          "role": "universidade que possui departamentos",
          "cardinality": "1"
        },
        {
          "entityId": "departamento",
          "role": "departamento pertencente à universidade",
          "cardinality": "N"
        }
      ],
      "attributes": []
    },
    {
      "id": "departamento_possui_professor",
      "name": "possui",
      "description": "Um departamento possui vários professores e cada professor pertence a apenas um departamento",
      "type": "1:N",
      "participants": [
        {
          "entityId": "departamento",
          "role": "departamento que possui professores",
          "cardinality": "1"
        },
        {
          "entityId": "professor",
          "role": "professor pertencente ao departamento",
          "cardinality": "N"
        }
      ],
      "attributes": []
    },
    {
      "id": "professor_possui_perfil_profissional",
      "name": "possui",
      "description": "Cada professor possui um perfil profissional único e cada perfil profissional pertence a apenas um professor",
      "type": "1:1",
      "participants": [
        {
          "entityId": "professor",
          "role": "professor que possui perfil profissional",
          "cardinality": "1"
        },
        {
          "entityId": "perfil_profissional",
          "role": "perfil profissional pertencente ao professor",
          "cardinality": "1"
        }
      ],
      "attributes": []
    },
    {
      "id": "aluno_cursa_disciplina",
      "name": "cursa",
      "description": "Alunos podem cursar várias disciplinas e cada disciplina pode ser cursada por vários alunos",
      "type": "N:N",
      "participants": [
        {
          "entityId": "aluno",
          "role": "aluno matriculado na disciplina",
          "cardinality": "N"
        },
        {
          "entityId": "disciplina",
          "role": "disciplina cursada pelo aluno",
          "cardinality": "N"
        }
      ],
      "attributes": [
        {
          "id": "matricula_data",
          "name": "dataMatricula",
          "type": "date",
          "description": "Data da matrícula do aluno na disciplina",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "matricula_nota_final",
          "name": "notaFinal",
          "type": "decimal",
          "description": "Nota final do aluno na disciplina",
          "identifier": false,
          "required": false,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        },
        {
          "id": "matricula_situacao",
          "name": "situacao",
          "type": "string",
          "description": "Situação do aluno na disciplina",
          "identifier": false,
          "required": true,
          "unique": false,
          "multivalued": false,
          "composite": false,
          "derived": false,
          "components": []
        }
      ]
    }
  ],
  "ambiguities": []
}

Agora gere o JSON para a descrição informada.
`;
}
