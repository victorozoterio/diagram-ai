# Resultados consolidados

## Execuções

Foram analisadas 30 execuções reais do pipeline conceitual: dez cenários, cada um com três repetições. Os arquivos em [runs/](runs) preservam descrição, requisição sem credenciais, stream de resposta, candidatos intermediários, resultado final ou falha e tempos.

| Indicador | Resultado |
|---|---:|
| Modelos finais válidos | 29/30 (96,67%) |
| Falhas | 1/30 (3,33%) |
| Reparos LLM acionados | 9/30 |
| Reparos concluídos | 9/9 |
| Pares válidos para ablação | 24/30 |
| Tempo médio / mediana / mínimo / máximo | 62,87 s / 52,88 s / 8,25 s / 324,13 s |

`S10-R3` terminou por timeout do Ollama. A falha participa das estatísticas de sucesso, falha e tempo, mas não recebe escore estrutural por não ter modelo final.

## Qualidade estrutural

| Métrica | Resultado |
|---|---:|
| F1 de entidades | 96,00% |
| F1 de atributos | 83,89% |
| F1 de relacionamentos | 89,89% |
| Acurácia de cardinalidades | 93,02% (80/86) |
| Detalhes composto/multivalorado | 0,00% (0/5) |

Nos 24 pares A/B válidos, a acurácia de cardinalidades passou de 54,55% (36/66) para 90,91% (60/66) após as heurísticas. Os F1 de entidades, atributos e relacionamentos permaneceram em 100,00%, 79,01% e 83,33%.

## Verificações técnicas

| Verificação | Resultado |
|---|---|
| API Vitest | 23 arquivos / 109 testes aprovados |
| Frontend Vitest | 19 arquivos / 88 testes aprovados |
| Avaliador Python | 7 testes aprovados |
| Lint e builds | aprovados |
| Conversão, conversão inversa e SQL | 29/29 modelos válidos processados sem exceção do serviço |

Métricas detalhadas: [metrics.json](metrics.json), [metrics.csv](metrics.csv) e [gráficos](../charts/).
