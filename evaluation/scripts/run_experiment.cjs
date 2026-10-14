// Executes the compiled production service/provider against local Ollama, without HTTP auth/DB.
// The first model candidate is captured before semantic heuristics; repair remains separate.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const api = path.join(root, 'apps/api/dist/src');
const { OllamaProvider } = require(path.join(api, 'ai/providers/ollama.provider.js'));
const { AiService } = require(path.join(api, 'ai/ai.service.js'));
const { DiagramsService } = require(path.join(api, 'diagrams/services/diagrams.service.js'));
const { ConceptualModelSchema } = require(path.join(api, 'diagrams/schemas/conceptual-model.schema.js'));
const scenarios = require(path.join(root, 'evaluation/scenarios/scenarios.json'));
const truth = require(path.join(root, 'evaluation/ground-truth/gabaritos.json'));
const outDir = path.join(root, 'evaluation/results/runs');
fs.mkdirSync(outDir, { recursive: true });

const ids = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const reps = Number(process.argv.find((arg) => arg.startsWith('--reps='))?.split('=')[1] ?? 1);
const selected = ids.length ? scenarios.filter((s) => ids.includes(s.id)) : scenarios;
if (selected.length === 0 || !Number.isInteger(reps) || reps < 1) throw new Error('Cenários/repetições inválidos');

function normalize(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
function matchEntity(a, b) {
  const x = normalize(a),
    y = normalize(b);
  return x === y || x.replace(/s$/, '') === y.replace(/s$/, '');
}
function answersFor(analysis, expected) {
  const answers = [],
    unresolved = [];
  for (const q of analysis.questions) {
    if (q.kind !== 'cardinality' || !q.participants) {
      unresolved.push({ id: q.id, reason: 'Pergunta não cardinal; sem resposta pré-definida no gabarito' });
      continue;
    }
    const relation = expected.relationships.find(
      (r) =>
        r.participants.length === 2 &&
        q.participants.every((p) => r.participants.some((side) => matchEntity(p, side.entity))),
    );
    if (!relation) {
      unresolved.push({ id: q.id, reason: 'Participantes não correspondem a relacionamento pré-anotado' });
      continue;
    }
    const choice = q.optionCardinalities?.find((option) =>
      option.cardinality.participants.every((p) =>
        relation.participants.some((side) => matchEntity(p.entity, side.entity) && p.cardinality === side.cardinality),
      ),
    );
    if (!choice) {
      unresolved.push({ id: q.id, reason: 'Nenhuma opção corresponde à cardinalidade do gabarito' });
      continue;
    }
    answers.push({
      questionId: q.id,
      questionText: q.text,
      kind: q.kind,
      answers: [q.options[choice.optionIndex]],
      cardinality: choice.cardinality,
      selectedOptionIndex: choice.optionIndex,
    });
  }
  return { answers, unresolved };
}
function now() {
  return performance.now();
}
function duration(start) {
  return Math.round((now() - start) * 10) / 10;
}
function validation(model) {
  const parsed = ConceptualModelSchema.safeParse(model);
  return {
    valid: parsed.success,
    issues: parsed.success ? [] : parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
  };
}
function logSummary(model) {
  if (!model) return null;
  const byId = new Map((model.entities ?? []).map((e) => [e.id, e.name]));
  return {
    entities: (model.entities ?? []).map((e) => e.name),
    relationships: (model.relationships ?? []).map((r) => ({
      name: r.name,
      kind: r.kind,
      participants: (r.participants ?? []).map((p) => ({
        entity: byId.get(p.entityId) ?? p.entityId,
        cardinality: p.cardinality,
      })),
    })),
  };
}
async function run(scenario, repetition) {
  const expected = truth.cases.find((c) => c.id === scenario.id);
  const base = {
    scenarioId: scenario.id,
    repetition,
    status: 'started',
    metadata: {
      startedAt: new Date().toISOString(),
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      model: process.env.OLLAMA_MODEL,
      baseUrl: process.env.OLLAMA_BASE_URL,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: os.cpus()[0]?.model,
      totalMemoryGiB: +(os.totalmem() / 2 ** 30).toFixed(2),
    },
    scenario,
    groundTruthStatus: truth.status,
    calls: [],
    stages: [],
    timingsMs: {},
  };
  const file = path.join(outDir, `${scenario.id}-R${repetition}.json`);
  const save = () => fs.writeFileSync(file, `${JSON.stringify(base, null, 2)}\n`);
  let stage = 'setup';
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    const request = JSON.parse(options.body);
    const started = now();
    const response = await originalFetch(url, options);
    const rawStream = await response.clone().text();
    const chunks = rawStream
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { unparsed: line };
        }
      });
    base.calls.push({
      stage,
      request,
      httpStatus: response.status,
      elapsedMs: duration(started),
      rawStream,
      assistantContent: chunks.map((c) => c.message?.content ?? '').join(''),
      finalMetrics:
        chunks.findLast((c) => c.done) &&
        Object.fromEntries(
          [
            'total_duration',
            'load_duration',
            'prompt_eval_count',
            'prompt_eval_duration',
            'eval_count',
            'eval_duration',
          ].map((k) => [k, chunks.findLast((c) => c.done)?.[k]]),
        ),
    });
    save();
    return response;
  };
  const config = {
    getOrThrow(key) {
      if (key === 'OLLAMA_BASE_URL') return process.env.OLLAMA_BASE_URL;
      if (key === 'OLLAMA_MODEL') return process.env.OLLAMA_MODEL;
      throw new Error(`Config desconhecida: ${key}`);
    },
  };
  const provider = new OllamaProvider(config);
  const ai = new AiService(provider);
  const service = new DiagramsService(ai, null, null, null);
  for (const method of ['generateConceptualModel', 'fixConceptualModel']) {
    const original = ai[method].bind(ai);
    ai[method] = async (...args) => {
      stage = method === 'generateConceptualModel' ? 'generation-initial' : 'generation-repair';
      const started = now();
      try {
        const candidate = await original(...args);
        base.stages.push({
          stage,
          elapsedMs: duration(started),
          model: structuredClone(candidate),
          zod: validation(candidate),
          summary: logSummary(candidate),
        });
        save();
        return candidate;
      } catch (error) {
        base.stages.push({ stage, elapsedMs: duration(started), error: String(error) });
        save();
        throw error;
      }
    };
  }
  const originalPrepare = service.prepareConceptualCandidate.bind(service);
  service.prepareConceptualCandidate = (...args) => {
    const started = now();
    const prepared = originalPrepare(...args);
    base.stages.push({
      stage: args[3] === 'reparo' ? 'heuristics-after-repair' : 'heuristics-initial',
      elapsedMs: duration(started),
      model: structuredClone(prepared.model),
      unresolved: structuredClone(prepared.unresolved),
      zod: validation(prepared.model),
      summary: logSummary(prepared.model),
    });
    save();
    return prepared;
  };
  const totalStart = now();
  try {
    stage = 'ambiguity-analysis';
    let started = now();
    const analysis = await service.analyzeAmbiguities({ description: scenario.description });
    base.timingsMs.ambiguityAnalysis = duration(started);
    base.analysis = analysis;
    base.clarifications = answersFor(analysis, expected);
    save();
    stage = 'generation';
    started = now();
    const final = await service.generate({
      mode: 'conceptual',
      description: scenario.description,
      clarifications: base.clarifications.answers.map(({ selectedOptionIndex, ...answer }) => answer),
    });
    base.timingsMs.generationIncludingRepair = duration(started);
    base.final = { model: final, zod: validation(final), summary: logSummary(final) };
    base.status = 'valid';
  } catch (error) {
    base.status = 'failed';
    base.error = { message: error?.message ?? String(error), response: error?.getResponse?.() };
  } finally {
    base.timingsMs.total = duration(totalStart);
    base.metadata.finishedAt = new Date().toISOString();
    global.fetch = originalFetch;
    save();
  }
  process.stdout.write(
    `${scenario.id} R${repetition}: ${base.status}, ${Math.round(base.timingsMs.total / 1000)}s, ` +
      `${base.analysis?.questions.length ?? '?'} pergunta(s), ${base.stages.length} estágio(s)\n`,
  );
}
(async () => {
  for (const scenario of selected)
    for (let repetition = 1; repetition <= reps; repetition++) {
      const file = path.join(outDir, `${scenario.id}-R${repetition}.json`);
      if (fs.existsSync(file) && JSON.parse(fs.readFileSync(file)).status !== 'started') {
        process.stdout.write(`${scenario.id} R${repetition}: já registrado; sem reexecução seletiva\n`);
        continue;
      }
      await run(scenario, repetition);
    }
})().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
