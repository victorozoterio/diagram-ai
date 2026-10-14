# Avaliação experimental do Diagram.AI

Esta pasta reúne cenários controlados, gabaritos estruturais, resultados brutos, métricas, gráficos, scripts de reprodução e resultados de usabilidade.

## Síntese

- 10 cenários de modelagem conceitual, com 3 repetições cada.
- 30 execuções reais com Ollama e `qwen2.5:7b-instruct`.
- 29 modelos finais válidos; `S10-R3` terminou por timeout.
- 24 pares válidos na comparação entre LLM inicial e heurísticas.
- SUS com 13 participantes e média de 89,23/100.

| Indicador | Resultado |
|---|---:|
| F1 de entidades | 96,00% |
| F1 de atributos | 83,89% |
| F1 de relacionamentos | 89,89% |
| Acurácia de cardinalidades | 93,02% (80/86) |
| Tempo médio por run | 62,87 s |

Consulte [report-for-tg.md](report-for-tg.md) para os resultados detalhados e [results/status.md](results/status.md) para o estado consolidado.

## Metodologia

Cada descrição passa por análise de ambiguidades, geração estruturada, validação Zod, normalizações determinísticas e reparo automático quando necessário. O avaliador compara entidades, atributos, relacionamentos, cardinalidades e detalhes especiais anotados nos gabaritos. Métricas estruturais usam os modelos finais válidos; sucesso, falha e tempo usam as 30 tentativas. A ablação compara o mesmo candidato inicial antes e após heurísticas, sem incluir reparo LLM.

O tempo manual nos gráficos é uma estimativa por fórmula, não uma observação com participantes. SUS mede usabilidade percebida, não acurácia, aprendizagem ou produtividade.

## Estrutura

```text
evaluation/
├── README.md
├── report-for-tg.md
├── scenarios/      descrições dos cenários
├── ground-truth/   gabaritos e critérios
├── results/        runs, métricas, ambiente e status
├── charts/         gráficos SVG
├── scripts/        reprodução e verificações
└── sus/            resultados anonimizados de usabilidade
```

## Reprodução

Pré-requisitos: Node.js, pnpm, Python 3, Ollama local e `qwen2.5:7b-instruct`. Consulte [results/environment.md](results/environment.md).

```bash
pnpm --filter @diagram-ai/api build
NODE_PATH="$PWD/apps/api/dist" node --env-file=apps/api/.env evaluation/scripts/run_experiment.cjs --reps=3
python3 evaluation/scripts/summarize_experiments.py
NODE_PATH="$PWD/apps/api/dist" node evaluation/scripts/smoke_downstream.cjs
node evaluation/scripts/verify_captures.cjs
python3 -m unittest discover -s evaluation/scripts -p 'test_*.py'
```

O questionário-fonte do SUS não é versionado; apenas agregados anonimizados estão em [sus/results.json](sus/results.json).

## Limitações

- Os gabaritos são uma rubrica estrutural explícita; veja [ground-truth/review.md](ground-truth/review.md).
- A avaliação cobre esta configuração local, não qualidade universal para quaisquer domínios ou modelos.
- Não houve estudo controlado de tempo humano, aprendizagem, transcrição de voz ou execução de DDL em servidores reais.
