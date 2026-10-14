"""Aggregate archived real runs and draw self-contained academic SVG charts.

Run after run_experiment.cjs. Never invokes the model or alters captured runs.
Failed/invalid outputs remain in denominators for success rates, but receive no
structural score. A/B uses paired initial candidates from the same raw response.
"""
import csv
import json
import statistics
from pathlib import Path
from xml.sax.saxutils import escape

from score_models import aggregate, score

BASE = Path(__file__).resolve().parents[1]
RESULTS = BASE / "results"
CHARTS = BASE / "charts"
CHARTS.mkdir(exist_ok=True)
TRUTH = json.loads((BASE / "ground-truth/gabaritos.json").read_text())
SCENARIOS = json.loads((BASE / "scenarios/scenarios.json").read_text())


def stage(run, name):
    return next((item for item in run.get("stages", []) if item["stage"] == name), None)


def stage_score(run, name, expected):
    item = stage(run, name)
    if not item or not item.get("zod", {}).get("valid") or not item.get("model"):
        return {"valid": False, "error": item.get("error") if item else "Estágio não produzido"}
    if name.startswith("heuristics") and item.get("unresolved"):
        return {"valid": False, "error": "Constraints de cardinalidade não resolvidas"}
    return {"valid": True, "metrics": score(expected, item["model"])}


def mean_or_none(values):
    return statistics.mean(values) if values else None


def distribution(values):
    return {"n": len(values), "mean": mean_or_none(values),
            "median": statistics.median(values) if values else None,
            "min": min(values) if values else None,
            "max": max(values) if values else None}


def manual_estimate(expected, description):
    """Hypothetical minutes, not observed human performance."""
    entity_count = len(expected["entities"])
    attribute_count = sum(len(e["attributes"]) for e in expected["entities"]) + sum(
        len(r.get("attributes", [])) for r in expected["relationships"])
    relation_count = len(expected["relationships"])
    special_count = len(expected.get("attribute_details", [])) + sum(
        r.get("kind") == "generalization" for r in expected["relationships"])
    words = len(description.split())
    read_expert = 0.5 + words / 120
    read_novice = 0.75 + words / 80
    expert = {"ler": read_expert, "entidades": .7 * entity_count,
              "atributos": .25 * attribute_count, "relacoes": 1.0 * relation_count,
              "particularidades": .5 * special_count, "organizar": 1.5, "revisar": 1.0}
    novice = {"ler": read_novice, "entidades": 1.5 * entity_count,
              "atributos": .6 * attribute_count, "relacoes": 2.0 * relation_count,
              "particularidades": 1.0 * special_count, "organizar": 3.0, "revisar": 2.0}
    return {"counts": {"words": words, "entities": entity_count, "attributes": attribute_count,
                       "relationships": relation_count, "special_features": special_count},
            "expert_minutes": round(sum(expert.values()), 2), "novice_minutes": round(sum(novice.values()), 2),
            "expert_breakdown": expert, "novice_breakdown": novice}


def write_svg(filename, title, subtitle, labels, series, maximum=None, unit="", note=""):
    # Each series: (legend label, [values], color); grouped bars, no external plotting dependency.
    width = 1120
    row_h = max(48, 26 + 18 * len(series))
    height = 132 + row_h * len(labels) + (44 if note else 0)
    plot_x, plot_w = 250, 820
    all_values = [v for _, values, _ in series for v in values if v is not None]
    cap = maximum or max(all_values or [1]) * 1.08
    if cap <= 0:
        cap = 1
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="chart-title">',
             f'<title id="chart-title">{escape(title)}</title>',
             '<rect width="100%" height="100%" fill="white"/>',
             f'<text x="24" y="35" font-family="Arial" font-size="22" font-weight="bold" fill="#20243a">{escape(title)}</text>',
             f'<text x="24" y="58" font-family="Arial" font-size="13" fill="#596175">{escape(subtitle)}</text>']
    for idx, (legend, _, color) in enumerate(series):
        x = 24 + idx * 275
        parts += [f'<rect x="{x}" y="76" width="14" height="14" fill="{color}"/>',
                  f'<text x="{x+20}" y="88" font-family="Arial" font-size="12" fill="#31364a">{escape(legend)}</text>']
    for i, label in enumerate(labels):
        y0 = 112 + i * row_h
        parts.append(f'<text x="24" y="{y0+18}" font-family="Arial" font-size="13" fill="#31364a">{escape(str(label))}</text>')
        for j, (_, values, color) in enumerate(series):
            value = values[i]
            bar_y = y0 + 4 + j * 18
            if value is None:
                parts.append(f'<text x="{plot_x}" y="{bar_y+12}" font-family="Arial" font-size="12" fill="#a04755">sem resultado</text>')
                continue
            length = max(0, min(plot_w, value / cap * plot_w))
            parts.append(f'<rect x="{plot_x}" y="{bar_y}" width="{length:.1f}" height="13" rx="3" fill="{color}"/>')
            parts.append(f'<text x="{min(plot_x+length+8,1060):.1f}" y="{bar_y+11}" font-family="Arial" font-size="11" fill="#31364a">{value:.1f}{escape(unit)}</text>')
    if note:
        parts.append(f'<text x="24" y="{height-19}" font-family="Arial" font-size="11" fill="#596175">{escape(note)}</text>')
    parts.append('</svg>')
    (CHARTS / filename).write_text("\n".join(parts) + "\n")


def main():
    runs = []
    for file in sorted((RESULTS / "runs").glob("S??-R?.json")):
        run = json.loads(file.read_text())
        if run.get("status") in ("valid", "failed"):
            runs.append(run)
    if not runs:
        raise SystemExit("Nenhuma execução concluída arquivada.")
    evaluated = []
    for run in runs:
        expected = next(c for c in TRUTH["cases"] if c["id"] == run["scenarioId"])
        a = stage_score(run, "generation-initial", expected)
        b = stage_score(run, "heuristics-initial", expected)
        final = {"valid": run["status"] == "valid" and run.get("final", {}).get("zod", {}).get("valid", False)}
        if final["valid"]:
            final["metrics"] = score(expected, run["final"]["model"])
        evaluated.append({"scenarioId": run["scenarioId"], "repetition": run["repetition"],
                          "status": run["status"], "analysisQuestions": len(run.get("analysis", {}).get("questions", [])),
                          "unresolvedQuestions": len(run.get("clarifications", {}).get("unresolved", [])),
                          "repairAttempts": int(any(s["stage"] == "generation-repair" for s in run.get("stages", []))),
                          "timingsMs": run.get("timingsMs", {}), "A": a, "B": b, "final": final,
                          "error": run.get("error")})
    paired = [item for item in evaluated if item["A"]["valid"] and item["B"]["valid"]]
    times = [item["timingsMs"].get("total", 0) / 1000 for item in evaluated]
    summary = {"groundTruthStatus": TRUTH["status"], "runs": evaluated,
               "counts": {"total": len(evaluated), "uniqueScenarios": len(set(e["scenarioId"] for e in evaluated)),
                          "finalSuccess": sum(e["final"]["valid"] for e in evaluated),
                          "repairAttempted": sum(e["repairAttempts"] for e in evaluated),
                          "repairSucceeded": sum(e["repairAttempts"] and e["final"]["valid"] for e in evaluated),
                          "Avalid": sum(e["A"]["valid"] for e in evaluated),
                          "Bvalid": sum(e["B"]["valid"] for e in evaluated), "pairedAB": len(paired)},
               "timeSeconds": distribution(times),
               "aggregateFinalValidOnly": aggregate([e["final"] for e in evaluated]),
               "aggregateAValidOnly": aggregate([e["A"] for e in evaluated]),
               "aggregateBValidOnly": aggregate([e["B"] for e in evaluated]),
               "aggregatePairedA": aggregate([e["A"] for e in paired]),
               "aggregatePairedB": aggregate([e["B"] for e in paired]),
               "manualEstimateIsHypothetical": True,
               "manualEstimates": {s["id"]: manual_estimate(next(c for c in TRUTH["cases"] if c["id"] == s["id"]), s["description"])
                                   for s in SCENARIOS}}
    if paired:
        summary["ablationPairedDeltas"] = {}
        for category in ("entities", "attributes", "relationships"):
            before = summary["aggregatePairedA"][category]["f1"]
            after = summary["aggregatePairedB"][category]["f1"]
            summary["ablationPairedDeltas"][category] = {
                "absolutePercentagePoints": 100 * (after - before),
                "relativePercent": 100 * (after - before) / before if before else None,
            }
        before = summary["aggregatePairedA"]["cardinalities"]["accuracy"]
        after = summary["aggregatePairedB"]["cardinalities"]["accuracy"]
        summary["ablationPairedDeltas"]["cardinalities"] = {
            "absolutePercentagePoints": 100 * (after - before) if before is not None and after is not None else None,
            "relativePercent": 100 * (after - before) / before if before else None,
        }
    # This is only a sensitivity scenario: human clarification/review times were
    # not observed. Compare a hypothetical correction allowance to manual estimates.
    summary["reviewSensitivity"] = {}
    for review_minutes in (0, 5, 10, 15):
        summary["reviewSensitivity"][str(review_minutes)] = {}
        for skill in ("expert", "novice"):
            comparisons = [(item["timingsMs"].get("total", 0)/60000 + review_minutes,
                            summary["manualEstimates"][item["scenarioId"]][f"{skill}_minutes"])
                           for item in evaluated if item["final"]["valid"]]
            summary["reviewSensitivity"][str(review_minutes)][skill] = {
                "assistedFasterCount": sum(assisted < manual for assisted, manual in comparisons),
                "denominator": len(comparisons),
            }
    (RESULTS / "metrics.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    with (RESULTS / "metrics.csv").open("w", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["scenario", "repetition", "status", "questions", "repair", "total_s", "analysis_s", "generation_s",
                         "A_valid", "B_valid", "final_valid", "entity_f1", "attribute_f1", "relationship_f1", "cardinality_accuracy", "attribute_detail_accuracy"])
        for item in evaluated:
            metrics = item["final"].get("metrics", {})
            writer.writerow([item["scenarioId"], item["repetition"], item["status"], item["analysisQuestions"],
                             item["repairAttempts"], item["timingsMs"].get("total", 0)/1000,
                             item["timingsMs"].get("ambiguityAnalysis", 0)/1000,
                             item["timingsMs"].get("generationIncludingRepair", 0)/1000,
                             item["A"]["valid"], item["B"]["valid"], item["final"]["valid"],
                             *[metrics.get(k, {}).get("f1") for k in ("entities", "attributes", "relationships")],
                             metrics.get("cardinalities", {}).get("accuracy"), metrics.get("attributeDetails", {}).get("accuracy")])
    labels = [s["id"] for s in SCENARIOS]
    by_scenario = {sid: [e for e in evaluated if e["scenarioId"] == sid] for sid in labels}
    def scen_values(fn):
        return [mean_or_none([v for e in by_scenario[sid] if (v := fn(e)) is not None]) for sid in labels]
    write_svg("structural-f1-by-scenario.svg", "Acurácia estrutural por cenário", "F1; apenas saídas finais válidas; lacuna = falha", labels,
              [("Entidades", scen_values(lambda e: e["final"].get("metrics", {}).get("entities", {}).get("f1") * 100 if e["final"]["valid"] else None), "#6e42cb"),
               ("Atributos", scen_values(lambda e: e["final"].get("metrics", {}).get("attributes", {}).get("f1") * 100 if e["final"]["valid"] else None), "#2197a8"),
               ("Relacionamentos", scen_values(lambda e: e["final"].get("metrics", {}).get("relationships", {}).get("f1") * 100 if e["final"]["valid"] else None), "#e5a635")], 100, "%")
    write_svg("cardinality-by-scenario.svg", "Cardinalidade por cenário", "Percentual de extremidades corretas sobre todas as esperadas no gabarito", labels,
              [("Acurácia de cardinalidade", scen_values(lambda e: e["final"]["metrics"]["cardinalities"]["accuracy"]*100 if e["final"]["valid"] and e["final"]["metrics"]["cardinalities"]["accuracy"] is not None else None), "#6e42cb")], 100, "%")
    cats = ["entities", "attributes", "relationships"]
    write_svg("precision-recall-f1.svg", "Precisão, revocação e F1 — modelo final", "Microagregação das saídas válidas; não inclui falhas no escore", ["Entidades", "Atributos", "Relações"],
              [("Precisão", [summary["aggregateFinalValidOnly"][k]["precision"]*100 for k in cats], "#6e42cb"),
               ("Revocação", [summary["aggregateFinalValidOnly"][k]["recall"]*100 for k in cats], "#2197a8"),
               ("F1", [summary["aggregateFinalValidOnly"][k]["f1"]*100 for k in cats], "#e5a635")], 100, "%") if summary["aggregateFinalValidOnly"] else None
    if paired:
        write_svg("ablation-paired.svg", "Ablação pareada: mesma saída inicial", "A = antes; B = após heurísticas; sem reparo LLM; apenas pares Zod-válidos", ["Entidades", "Atributos", "Relações", "Cardinalidades"],
                  [("A — LLM parseado", [summary["aggregatePairedA"][k]["f1"]*100 for k in cats] + [summary["aggregatePairedA"]["cardinalities"]["accuracy"]*100], "#8f98a7"),
                   ("B — heurísticas", [summary["aggregatePairedB"][k]["f1"]*100 for k in cats] + [summary["aggregatePairedB"]["cardinalities"]["accuracy"]*100], "#6e42cb")], 100, "%", f"Pares avaliados: {len(paired)} de {len(evaluated)} execuções")
    write_svg("generation-time.svg", "Tempo real do pipeline por cenário", "Tempo de parede medido no harness; análise e geração/reparo", labels,
              [("Análise de ambiguidades", scen_values(lambda e: e["timingsMs"].get("ambiguityAnalysis", 0)/1000), "#2197a8"),
               ("Geração + reparo", scen_values(lambda e: e["timingsMs"].get("generationIncludingRepair", 0)/1000 if e["status"] == "valid" else None), "#6e42cb")], unit=" s")
    write_svg("manual-vs-assisted.svg", "Tempo assistido medido × manual estimado", "IA = espera computacional real; manual = simulação, não observação humana", labels,
              [("IA, tempo total real", scen_values(lambda e: e["timingsMs"].get("total", 0)/60000), "#6e42cb"),
               ("Manual experiente, estimativa", [summary["manualEstimates"][sid]["expert_minutes"] for sid in labels], "#2197a8"),
               ("Manual iniciante, estimativa", [summary["manualEstimates"][sid]["novice_minutes"] for sid in labels], "#e5a635")], unit=" min", note="IA não inclui tempo humano de responder perguntas/revisar; faixas manuais são hipotéticas.")
    write_svg("generation-success.svg", "Sucesso e falha por cenário", "Contagem real de execuções completas", labels,
              [("Modelo final válido", [sum(e["final"]["valid"] for e in by_scenario[sid]) for sid in labels], "#6e42cb"),
               ("Falha", [sum(not e["final"]["valid"] for e in by_scenario[sid]) for sid in labels], "#a04755")], unit=" execução(ões)")
    sus = json.loads((BASE / "sus/results.json").read_text())
    write_svg("sus-distribution.svg", "Pontuações SUS observadas", "13 respostas anonimizadas; escala SUS 0–100; linha de referência 70 é textual", list(sus["individual"]),
              [("SUS medido", list(sus["individual"].values()), "#6e42cb")], 100, " pontos", note="Média 89,23; mediana 92,5; desvio-padrão amostral 10,17; 13/13 ≥ 70.")
    sus_values = list(sus["individual"].values())
    buckets = [("70–79,9", 70, 80), ("80–89,9", 80, 90), ("90–100", 90, 101)]
    write_svg("sus-histogram.svg", "Distribuição SUS", "Frequências observadas, n=13; classes mutuamente exclusivas", [name for name, _, _ in buckets],
              [("Participantes", [sum(lo <= value < hi for value in sus_values) for _, lo, hi in buckets], "#6e42cb")], unit=" pessoas")
    print(json.dumps(summary["counts"], ensure_ascii=False))
    print("Tempo (s):", summary["timeSeconds"])


if __name__ == "__main__":
    main()
