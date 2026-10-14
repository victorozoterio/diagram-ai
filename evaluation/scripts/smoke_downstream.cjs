// Replays only deterministic production services on archived conceptual outputs.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const api = path.join(root, 'apps/api/dist/src');
const { ConceptualModelSchema } = require(path.join(api, 'diagrams/schemas/conceptual-model.schema.js'));
const { LogicalModelSchema } = require(path.join(api, 'diagrams/schemas/logical-model.schema.js'));
const { LogicalModelConverterService } = require(
  path.join(api, 'diagrams/services/logical-model-converter.service.js'),
);
const { LogicalToConceptualConverterService } = require(
  path.join(api, 'diagrams/services/logical-to-conceptual-converter.service.js'),
);
const { SqlGeneratorService } = require(path.join(api, 'diagrams/services/sql-generator.service.js'));
const { DiagramsService } = require(path.join(api, 'diagrams/services/diagrams.service.js'));

const service = new DiagramsService(
  null,
  new LogicalModelConverterService(),
  new LogicalToConceptualConverterService(),
  new SqlGeneratorService(),
);
const dir = path.join(root, 'evaluation/results/runs');
const results = [];
for (const file of fs.readdirSync(dir).filter((name) => /^S\d\d-R\d+\.json$/.test(name))) {
  const run = JSON.parse(fs.readFileSync(path.join(dir, file)));
  if (run.status !== 'valid') continue;
  const result = {
    scenarioId: run.scenarioId,
    repetition: run.repetition,
    conceptualValid: false,
    logicalValid: false,
    reverseValid: false,
    sql: {},
  };
  try {
    const conceptual = ConceptualModelSchema.parse(run.final.model);
    result.conceptualValid = true;
    const logical = service.convertToLogical(conceptual);
    result.logicalValid = LogicalModelSchema.safeParse(logical).success;
    result.logicalTables = logical.tables.length;
    result.reverseValid = ConceptualModelSchema.safeParse(service.convertToConceptual(logical)).success;
    for (const dialect of ['postgresql', 'mysql', 'mariadb', 'sqlserver']) {
      const sql = service.generateSql(logical, dialect);
      result.sql[dialect] = { valid: sql.includes('CREATE TABLE'), bytes: Buffer.byteLength(sql) };
    }
  } catch (error) {
    result.error = error?.getResponse?.() ?? String(error);
  }
  results.push(result);
}
const target = path.join(root, 'evaluation/results/downstream.json');
fs.writeFileSync(target, `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(
  `${results.length} modelo(s) verificados; ${results.filter((r) => r.logicalValid).length} conversões válidas\n`,
);
