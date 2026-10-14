# Resultados experimentais do Diagram.AI

## Objetivo e método

Esta avaliação examina a geração de modelos conceituais a partir de descrições textuais. O pipeline combina análise de ambiguidades, geração estruturada com Ollama, validação Zod, normalizações determinísticas e reparo automático. Foram utilizados dez cenários ([scenarios/scenarios.json](scenarios/scenarios.json)), três vezes cada, totalizando 30 execuções.

Os gabaritos em [ground-truth/gabaritos.json](ground-truth/gabaritos.json) definem entidades, atributos, relacionamentos, cardinalidades e detalhes especiais esperados. O avaliador calcula precisão, revocação e F1 microagregados; cardinalidades são comparadas pela identidade do participante. A comparação A/B avalia o mesmo candidato inicial do LLM antes e depois das heurísticas, sem incluir reparo LLM.

O ambiente utilizou Ollama `0.33.3` com `qwen2.5:7b-instruct`, temperatura 0, contexto 4096, limite de geração de 1536 tokens e timeout de 120 s. Os detalhes estão em [results/environment.md](results/environment.md).

## Resultados

Das 30 execuções, 29 produziram modelo final válido (96,67%). `S10-R3` terminou por timeout; ela integra as métricas de sucesso, falha e tempo, mas não recebe escore estrutural por não possuir modelo final.

| Métrica final | Resultado |
|---|---:|
| Entidades — precisão / revocação / F1 | 96,00% / 96,00% / **96,00%** |
| Atributos — precisão / revocação / F1 | 89,29% / 79,11% / **83,89%** |
| Relacionamentos — precisão / revocação / F1 | 93,02% / 86,96% / **89,89%** |
| Cardinalidades | **93,02%** (80/86) |
| Detalhes composto/multivalorado anotados | **0,00%** (0/5) |
| Tempo médio / mediana / mínimo / máximo | 62,87 s / 52,88 s / 8,25 s / 324,13 s |

| Cenário | Válidos/3 | F1 entidades | F1 atributos | F1 relações | Cardinalidade |
|---|---:|---:|---:|---:|---:|
| S01 | 3 | 100,00% | 0,00% | 100,00% | 100,00% |
| S02 | 3 | 100,00% | 100,00% | 100,00% | 100,00% |
| S03 | 3 | 100,00% | 100,00% | 100,00% | 100,00% |
| S04 | 3 | 100,00% | 100,00% | 100,00% | 100,00% |
| S05 | 3 | 100,00% | 100,00% | 100,00% | 100,00% |
| S06 | 3 | 100,00% | 66,67% | 100,00% | 100,00% |
| S07 | 3 | 100,00% | 28,57% | 66,67% | 100,00% |
| S08 | 3 | 66,67% | 83,33% | 50,00% | 50,00% |
| S09 | 3 | 100,00% | 92,31% | 100,00% | 100,00% |
| S10 | 2 | 100,00% | 100,00% | 100,00% | 100,00% |

Os gráficos estão em [charts/](charts/), e os dados detalhados em [results/metrics.json](results/metrics.json) e [results/metrics.csv](results/metrics.csv).

## Heurísticas determinísticas

Nos 24 pares válidos, a acurácia de cardinalidades passou de 54,55% (36/66) para 90,91% (60/66) após as heurísticas. Os F1 de entidades, atributos e relacionamentos permaneceram em 100,00%, 79,01% e 83,33%, respectivamente. O resultado está visualizado em [charts/ablation-paired.svg](charts/ablation-paired.svg).

## Usabilidade percebida

O SUS contou com 13 respostas completas e anonimizadas: média 89,23, mediana 92,5, mínimo 70, máximo 100 e desvio-padrão amostral 10,17. Todos os participantes tiveram pontuação igual ou superior a 70. A análise está em [sus/analysis.md](sus/analysis.md).

SUS representa usabilidade percebida; não mede acurácia estrutural, produtividade objetiva ou aprendizagem.

## Verificações técnicas e limitações

Foram aprovados 109 testes da API, 88 testes do frontend e sete testes do avaliador Python, além de lint e builds. Os 29 modelos válidos converteram para o modelo lógico, retornaram ao conceitual e geraram SQL para PostgreSQL, MySQL, MariaDB e SQL Server sem exceção do serviço.

Os gabaritos constituem uma rubrica estrutural e não esgotam equivalências semânticas possíveis. A avaliação não inclui execução de DDL em instâncias reais, estudo controlado de tempo humano, aprendizagem ou transcrição de voz. O schema conceitual registra cardinalidades máximas `1` e `N`, sem participação mínima.
