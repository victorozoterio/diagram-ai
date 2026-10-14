import unittest

from score_models import aggregate, score


class ScoringTest(unittest.TestCase):
    def setUp(self):
        self.expected = {
            "entities": [
                {"name": "origem", "attributes": ["nome"]},
                {"name": "destino", "attributes": []},
            ],
            "relationships": [{"name": "liga", "participants": [
                {"entity": "origem", "cardinality": "1"},
                {"entity": "destino", "cardinality": "N"},
            ]}],
        }
        self.actual = {
            "entities": [
                {"id": "a", "name": "origem", "attributes": [{"name": "nome"},
                    {"name": "id_origem", "identifier": True}]},
                {"id": "b", "name": "destino", "attributes": []},
            ],
            "relationships": [{"name": "liga", "participants": [
                {"entityId": "b", "cardinality": "N"},
                {"entityId": "a", "cardinality": "1"},
            ]}],
        }

    def test_orientation_is_by_entity_not_position(self):
        result = score(self.expected, self.actual)
        self.assertEqual(result["cardinalities"]["accuracy"], 1)
        self.assertEqual(result["attributes"]["f1"], 1)

    def test_inverted_cardinality_and_missing_relation(self):
        self.actual["relationships"][0]["participants"][0]["cardinality"] = "1"
        self.assertEqual(score(self.expected, self.actual)["cardinalities"]["accuracy"], 0.5)
        self.actual["relationships"] = []
        result = score(self.expected, self.actual)
        self.assertEqual(result["relationships"]["missing"], 1)
        self.assertEqual(result["cardinalities"]["accuracy"], 0)

    def test_extra_entity_is_penalized(self):
        self.actual["entities"].append({"id": "c", "name": "inventada", "attributes": []})
        self.assertEqual(score(self.expected, self.actual)["entities"]["extra"], 1)

    def test_relationship_attribute_is_scored(self):
        self.expected["relationships"][0]["attributes"] = ["data_inicio"]
        self.actual["relationships"][0]["attributes"] = [{"name": "data_inicio"}]
        self.assertEqual(score(self.expected, self.actual)["attributes"]["f1"], 1)
        self.actual["relationships"][0]["attributes"] = [{"name": "participante"}]
        outcome = score(self.expected, self.actual)["attributes"]
        self.assertEqual((outcome["extra"], outcome["missing"]), (1, 1))

    def test_composite_detail_requires_components(self):
        self.expected["attribute_details"] = [{"entity": "origem", "attribute": "nome", "composite": True,
                                               "components": ["primeiro", "ultimo"]}]
        self.actual["entities"][0]["attributes"][0].update({"composite": True, "components": []})
        self.assertEqual(score(self.expected, self.actual)["attributeDetails"]["accuracy"], 0)
        self.actual["entities"][0]["attributes"][0]["components"] = [
            {"name": "primeiro"}, {"name": "ultimo"}]
        self.assertEqual(score(self.expected, self.actual)["attributeDetails"]["accuracy"], 1)

    def test_multivalued_detail_requires_flag(self):
        self.expected["attribute_details"] = [{"entity": "origem", "attribute": "nome", "multivalued": True}]
        self.actual["entities"][0]["attributes"][0]["multivalued"] = False
        self.assertEqual(score(self.expected, self.actual)["attributeDetails"]["accuracy"], 0)
        self.actual["entities"][0]["attributes"][0]["multivalued"] = True
        self.assertEqual(score(self.expected, self.actual)["attributeDetails"]["accuracy"], 1)

    def test_aggregate_excludes_failed_runs_but_keeps_them_for_validity(self):
        outcome = aggregate([
            {"valid": True, "metrics": score(self.expected, self.actual)},
            {"valid": False, "error": "generation_failed"},
        ])
        self.assertEqual(outcome["valid_runs_only"], 1)
        self.assertEqual(outcome["cardinalities"]["denominator_expected_participant_sides"], 2)


if __name__ == "__main__":
    unittest.main()
