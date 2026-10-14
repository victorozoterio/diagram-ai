# Critérios dos gabaritos

Os gabaritos em [gabaritos.json](gabaritos.json) definem a referência estrutural do avaliador: entidades, atributos, relacionamentos binários, cardinalidades por participante e detalhes de atributos quando aplicável.

| Cenário | Estrutura principal avaliada |
|---|---|
| S01 | Paciente 1:N consulta e atributos declarados |
| S02 | Editora 1:N revista e atributo de edição |
| S03 | Leitor e livro associados a empréstimo; datas no evento |
| S04 | Aluno N:N disciplina com data e nota na associação |
| S05 | Fornecedor N:N produto com preço na associação |
| S06 | Hóspede e quarto associados a reserva; período no evento |
| S07 | Generalização pessoa, professor e aluno; orientação 1:N |
| S08 | Programa 1:N episódio e apresentador N:N programa |
| S09 | Duas relações 1:N e atributo multivalorado |
| S10 | Endereço composto e participação N:N com data |

Alterações nos critérios exigem reprocessar todas as execuções para manter a comparabilidade das métricas.
