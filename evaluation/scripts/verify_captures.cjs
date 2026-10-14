// Verifies that the archived initial candidate still equals a fresh parse of
// the archived Ollama content; no regeneration or file mutation.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const { parseConceptualModelResponse } = require(
  path.join(root, 'apps/api/dist/src/ai/providers/ollama/conceptual-model-response.parser.js'),
);
const dir = path.join(root, 'evaluation/results/runs');
let checked = 0;
let mismatched = 0;
for (const file of fs.readdirSync(dir).filter((name) => /^S\d\d-R\d+\.json$/.test(name))) {
  const run = JSON.parse(fs.readFileSync(path.join(dir, file)));
  const call = run.calls?.find((item) => item.stage === 'generation-initial');
  const captured = run.stages?.find((item) => item.stage === 'generation-initial')?.model;
  if (!call || !captured) continue;
  checked++;
  const reparsed = parseConceptualModelResponse(call.assistantContent, run.scenario.description);
  const { metadata: _metadata, ...withoutMetadata } = captured;
  if (JSON.stringify(reparsed) !== JSON.stringify({ metadata: {}, ...withoutMetadata })) {
    mismatched++;
    process.stderr.write(`${file}: candidato arquivado diverge da resposta bruta parseada\n`);
  }
}
process.stdout.write(`${checked} candidatos conferidos; ${mismatched} divergência(s)\n`);
if (mismatched) process.exitCode = 1;
