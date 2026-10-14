"""Compute anonymized SUS results from the original tab-separated questionnaire.

Usage: python3 evaluation/sus/analyze.py /absolute/path/to/respostas-do-sus.txt
The source remains outside the repository. No email, timestamp or verbatim comment
is read into the output structure.
"""

import csv
import json
import statistics
import sys
from collections import Counter
from pathlib import Path

SUS_COLUMNS = (16, 18, 19, 20, 21, 22, 23, 24, 25, 26)
RATING_COLUMNS = {
    "conhecimento_previo": 4,
    "facilidade_login": 6,
    "facilidade_novo_diagrama": 8,
    "experiencia_geracao": 10,
    "facilidade_canvas": 12,
    "facilidade_conversao_sql": 14,
}


def summarize(values):
    return {
        "n": len(values),
        "mean": round(statistics.mean(values), 4),
        "median": statistics.median(values),
        "min": min(values),
        "max": max(values),
        "sample_standard_deviation": round(statistics.stdev(values), 4)
        if len(values) > 1 else None,
    }


def analyze(path):
    with Path(path).open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.reader(source, delimiter="\t"))
    if len(rows) < 2 or len(rows[0]) < 27:
        raise ValueError("Questionário vazio ou com colunas insuficientes")
    header, answers = rows[0], rows[1:]
    if not header[16].lstrip().startswith("1. Eu acho") or not header[26].lstrip().startswith("10. Precisei"):
        raise ValueError("Colunas SUS não correspondem ao formulário esperado")
    if any(len(row) < 27 for row in answers):
        raise ValueError("Linha incompleta")

    scores = []
    for row in answers:
        values = [int(row[column]) for column in SUS_COLUMNS]
        if any(value not in range(1, 6) for value in values):
            raise ValueError("Resposta SUS fora da escala 1–5")
        contribution = sum(value - 1 if index % 2 == 0 else 5 - value
                           for index, value in enumerate(values))
        scores.append(contribution * 2.5)

    supplementary = {}
    for name, column in RATING_COLUMNS.items():
        values = [int(row[column]) for row in answers if row[column].strip()]
        if any(value not in range(1, 6) for value in values):
            raise ValueError(f"Escala inválida em {name}")
        supplementary[name] = summarize(values)

    return {
        "source": "Questionário SUS fornecido pelos autores; dados pessoais omitidos",
        "formula": "itens ímpares: resposta - 1; pares: 5 - resposta; soma × 2,5",
        "participants": len(scores),
        "individual_scores": [
            {"participant": f"P{index:02d}", "score": score}
            for index, score in enumerate(scores, 1)
        ],
        "sus": {**summarize(scores), "at_or_above_70": sum(score >= 70 for score in scores)},
        "supplementary_ratings": supplementary,
        "traditional_tool_experience": dict(Counter(row[5].strip().casefold() for row in answers)),
        "semester": dict(Counter(row[3].strip() for row in answers)),
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python3 evaluation/sus/analyze.py /caminho/privado/respostas-do-sus.txt")
    print(json.dumps(analyze(sys.argv[1]), ensure_ascii=False, indent=2))
