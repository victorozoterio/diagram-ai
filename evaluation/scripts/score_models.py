"""Score a captured conceptual-model run against a PRELIMINARY expert key.

Input JSON: {"scenarioId":"S01", "status":"valid", "model":{...},
             "metadata":{"commit":"...","model":"...","temperature":0,...}}
or {"scenarioId":"S01","status":"failed","error":"...","metadata":{...}}.
The caller must archive the exact raw model and settings separately. No LLM call here.
"""

import argparse
import json
import re
import unicodedata
from pathlib import Path


def key(value):
    plain = unicodedata.normalize("NFKD", str(value).casefold())
    plain = "".join(character for character in plain if not unicodedata.combining(character))
    return re.sub(r"[^a-z0-9]+", "_", plain).strip("_")


def names(candidate):
    return {key(candidate["name"]), *(key(alias) for alias in candidate.get("aliases", []))}


def metrics(found, extra, missing):
    precision = found / (found + extra) if found + extra else 0.0
    recall = found / (found + missing) if found + missing else 0.0
    return {"correct": found, "extra": extra, "missing": missing,
            "precision": precision, "recall": recall,
            "f1": 2 * precision * recall / (precision + recall) if precision + recall else 0.0}


def match_entities(expected, actual):
    matches, used = [], set()
    for wanted in expected:
        match = next((index for index, item in enumerate(actual)
                      if index not in used and key(item.get("name", "")) in names(wanted)), None)
        if match is not None:
            used.add(match)
            matches.append((wanted, actual[match]))
    return matches, used


def is_technical_identifier(attribute):
    return bool(attribute.get("identifier") and
                key(attribute.get("name", "")).startswith("id_"))


def score(expected, actual):
    entities = actual.get("entities", [])
    relationships = actual.get("relationships", [])
    expected_entities = expected["entities"]
    matched_entities, used_entities = match_entities(expected_entities, entities)
    entity_score = metrics(len(matched_entities), len(entities) - len(used_entities),
                           len(expected_entities) - len(matched_entities))

    expected_attrs = {("entity", key(entity["name"]), key(attribute))
                      for entity in expected_entities for attribute in entity["attributes"]}
    actual_attrs = set()
    entity_aliases = {}
    for wanted, observed in matched_entities:
        entity_aliases[observed.get("id")] = key(wanted["name"])
        entity_aliases[key(observed.get("name", ""))] = key(wanted["name"])
    for entity in entities:
        entity_name = entity_aliases.get(entity.get("id"), key(entity.get("name", "")))
        for attribute in entity.get("attributes", []):
            if not is_technical_identifier(attribute):
                actual_attrs.add(("entity", entity_name, key(attribute.get("name", ""))))

    actual_names_by_id = {entity.get("id"): entity_aliases.get(entity.get("id"), key(entity.get("name", "")))
                          for entity in entities}
    used_relationships = set()
    matched_relationships = []
    for wanted in expected["relationships"]:
        kind = wanted.get("kind", "relationship")
        candidates = []
        for index, observed in enumerate(relationships):
            if index in used_relationships:
                continue
            if kind == "generalization":
                if observed.get("kind") not in ("generalization", "specialization"):
                    continue
                if (actual_names_by_id.get(observed.get("supertypeId")) == key(wanted["supertype"]) and
                    {actual_names_by_id.get(identifier) for identifier in observed.get("subtypeIds", [])} ==
                        {key(name) for name in wanted["subtypes"]}):
                    candidates.append(index)
            else:
                if observed.get("kind", "relationship") in ("generalization", "specialization"):
                    continue
                pair = {actual_names_by_id.get(participant.get("entityId"))
                        for participant in observed.get("participants", [])}
                if pair == {key(participant["entity"]) for participant in wanted["participants"]}:
                    candidates.append(index)
        # A unique participant pair is semantic evidence. For multiple associations
        # between the same pair, require a predeclared name/alias rather than guessing.
        selected = next((index for index in candidates
                         if key(relationships[index].get("name", "")) in names(wanted)), None)
        if selected is None and len(candidates) == 1:
            competing = [item for item in expected["relationships"]
                         if item is not wanted and item.get("kind", "relationship") != "generalization" and
                         {key(participant["entity"]) for participant in item["participants"]} ==
                         {key(participant["entity"]) for participant in wanted["participants"]}]
            if not competing:
                selected = candidates[0]
        if selected is not None:
            used_relationships.add(selected)
            matched_relationships.append((wanted, relationships[selected]))
    relationship_score = metrics(len(matched_relationships),
                                 len(relationships) - len(used_relationships),
                                 len(expected["relationships"]) - len(matched_relationships))

    # Relationship attributes are evaluated too, using the already established
    # relationship match; an unmatched relationship cannot earn attribute TP.
    expected_attrs.update(("relationship", key(relation["name"]), key(attribute))
                          for relation in expected["relationships"] for attribute in relation.get("attributes", []))
    matched_by_identity = {id(observed): wanted for wanted, observed in matched_relationships}
    for observed in relationships:
        wanted = matched_by_identity.get(id(observed))
        relation_name = key(wanted["name"]) if wanted else key(observed.get("name", ""))
        for attribute in observed.get("attributes", []):
            if not is_technical_identifier(attribute):
                actual_attrs.add(("relationship", relation_name, key(attribute.get("name", ""))))
    attr_score = metrics(len(expected_attrs & actual_attrs), len(actual_attrs - expected_attrs),
                         len(expected_attrs - actual_attrs))

    expected_sides = sum(len(item["participants"]) for item in expected["relationships"])
    correct_sides = 0
    for wanted, observed in matched_relationships:
        observed_sides = {actual_names_by_id.get(side.get("entityId")): side.get("cardinality")
                          for side in observed.get("participants", [])}
        correct_sides += sum(observed_sides.get(key(side["entity"])) == side["cardinality"]
                             for side in wanted["participants"])

    correct_details = 0
    for detail in expected.get("attribute_details", []):
        owner = next((observed for wanted, observed in matched_entities
                      if key(wanted["name"]) == key(detail["entity"])), None)
        attr = next((attribute for attribute in owner.get("attributes", [])
                     if key(attribute.get("name", "")) == key(detail["attribute"])), None) if owner else None
        if attr is None:
            continue
        correct = all(attr.get(flag) == detail[flag]
                      for flag in ("composite", "multivalued") if flag in detail)
        if "components" in detail:
            correct = correct and {key(component.get("name", "")) for component in attr.get("components", [])} == {
                key(component) for component in detail["components"]}
        correct_details += bool(correct)

    return {
        "entities": entity_score,
        "attributes": attr_score,
        "relationships": relationship_score,
        "cardinalities": {"correct_participant_sides": correct_sides,
                          "denominator_expected_participant_sides": expected_sides,
                          "accuracy": correct_sides / expected_sides if expected_sides else None},
        "attributeDetails": {"correct": correct_details,
                             "denominator": len(expected.get("attribute_details", [])),
                             "accuracy": correct_details / len(expected["attribute_details"])
                             if expected.get("attribute_details") else None},
        "notes": "Atributos de entidade e relacionamento (nomes de primeiro nível); detalhes composto/multivalorado explícitos no gabarito avaliados separadamente. Equivalência semântica ampla requer revisão humana."
    }


def score_run(run, ground_truth):
    scenario = next((case for case in ground_truth["cases"] if case["id"] == run["scenarioId"]), None)
    if scenario is None:
        raise ValueError("Cenário ausente do gabarito")
    if run["status"] == "failed":
        return {"scenarioId": run["scenarioId"], "valid": False,
                "error": run.get("error"), "metadata": run.get("metadata", {})}
    if run["status"] != "valid" or not isinstance(run.get("model"), dict):
        raise ValueError("Run deve conter status=valid e model, ou status=failed")
    return {"scenarioId": run["scenarioId"], "valid": True,
            "metadata": run.get("metadata", {}), "metrics": score(scenario, run["model"])}


def aggregate(results):
    valid = [item["metrics"] for item in results if item["valid"]]
    if not valid:
        return None
    categories = {}
    for category in ("entities", "attributes", "relationships"):
        categories[category] = metrics(
            sum(item[category]["correct"] for item in valid),
            sum(item[category]["extra"] for item in valid),
            sum(item[category]["missing"] for item in valid),
        )
    correct = sum(item["cardinalities"]["correct_participant_sides"] for item in valid)
    denominator = sum(item["cardinalities"]["denominator_expected_participant_sides"] for item in valid)
    correct_details = sum(item["attributeDetails"]["correct"] for item in valid)
    detail_denominator = sum(item["attributeDetails"]["denominator"] for item in valid)
    return {"valid_runs_only": len(valid), "entities": categories["entities"],
            "attributes": categories["attributes"], "relationships": categories["relationships"],
            "cardinalities": {"correct_participant_sides": correct,
                              "denominator_expected_participant_sides": denominator,
                              "accuracy": correct / denominator if denominator else None},
            "attributeDetails": {"correct": correct_details, "denominator": detail_denominator,
                                 "accuracy": correct_details / detail_denominator if detail_denominator else None}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("run", type=Path, help="JSON com run ou lista de runs reais arquivados")
    parser.add_argument("--ground-truth", type=Path,
                        default=Path(__file__).resolve().parents[1] / "ground-truth/gabaritos.json")
    args = parser.parse_args()
    run = json.loads(args.run.read_text(encoding="utf-8"))
    truth = json.loads(args.ground_truth.read_text(encoding="utf-8"))
    runs = run if isinstance(run, list) else [run]
    results = [score_run(item, truth) for item in runs]
    print(json.dumps({"runs": results, "aggregate_valid_runs_only": aggregate(results),
                      "valid_outputs": sum(item["valid"] for item in results),
                      "total_runs": len(results),
                      "valid_output_rate": sum(item["valid"] for item in results) / len(results)
                      if results else None}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
