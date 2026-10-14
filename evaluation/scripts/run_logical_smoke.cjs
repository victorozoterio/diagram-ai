// Optional one-case real Ollama smoke for the direct logical-generation path.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const api = path.join(root, 'apps/api/dist/src');
const { OllamaProvider } = require(path.join(api, 'ai/providers/ollama.provider.js'));
const { AiService } = require(path.join(api, 'ai/ai.service.js'));
const { DiagramsService } = require(path.join(api, 'diagrams/services/diagrams.service.js'));
const scenario = require(path.join(root, 'evaluation/scenarios/scenarios.json'))[1];
const originalFetch = global.fetch;
const output = {
  scenarioId: scenario.id,
  mode: 'logical',
  startedAt: new Date().toISOString(),
  modelName: process.env.OLLAMA_MODEL,
  calls: [],
};
global.fetch = async (url, options) => {
  const started = performance.now();
  const response = await originalFetch(url, options);
  const rawStream = await response.clone().text();
  const chunks = rawStream
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  output.calls.push({
    request: JSON.parse(options.body),
    rawStream,
    assistantContent: chunks.map((chunk) => chunk.message?.content ?? '').join(''),
    elapsedMs: performance.now() - started,
    httpStatus: response.status,
  });
  return response;
};
const config = {
  getOrThrow(key) {
    return process.env[key];
  },
};
const service = new DiagramsService(new AiService(new OllamaProvider(config)), null, null, null);
(async () => {
  const started = performance.now();
  try {
    output.finalModel = await service.generate({ description: scenario.description, mode: 'logical' });
    output.status = 'valid';
  } catch (error) {
    output.status = 'failed';
    output.error = error?.getResponse?.() ?? String(error);
  } finally {
    output.elapsedMs = performance.now() - started;
    output.finishedAt = new Date().toISOString();
    global.fetch = originalFetch;
    fs.writeFileSync(path.join(root, 'evaluation/results/logical-smoke.json'), `${JSON.stringify(output, null, 2)}\n`);
    process.stdout.write(`Geração lógica direta S02: ${output.status}, ${Math.round(output.elapsedMs / 1000)}s\n`);
  }
})().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
