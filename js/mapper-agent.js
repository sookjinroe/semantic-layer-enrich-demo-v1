// ============================================================
// mapper-agent.js — Mapper 실행 루프.
//   단위: 코드표 하나 (Render 는 컬럼 하나 — 방향이 반대).
//   도구: window.RenderAgent.makeTools / dispatch / stripFences 재사용.
//   시드: window.MapperSeeds (코드표 정체 + store 스코프 테이블 목록).
//   blind: 기계 매핑은 시드에 없음.
// window.MapperAgent 로 노출.
// ============================================================
(function (root) {

const MAX_OPS = 12;

function seedText(seed, scopeTables) {
  const parts = [];
  parts.push(`[코드표] ${seed.name} (kind: ${seed.kind})`);
  if (seed.definition_file) parts.push(`[정의 위치] ${seed.definition_file}` + (seed.nested_in ? ` (중첩: ${seed.nested_in} 안)` : ""));
  if (seed.note) parts.push(`[비고] ${seed.note}`);
  const entries = seed.entries.map((e) => e.code === null ? e.name : `${e.code}=${e.name}`).join(", ");
  parts.push(`[항목 ${seed.entries.length}] ${entries}`);
  parts.push(`[스코프 테이블 ${scopeTables.length}] ${scopeTables.join(", ")}`);
  return parts.join("\n");
}

function userPrompt(seed, scopeTables, log, left) {
  const parts = [seedText(seed, scopeTables), ""];
  if (log.length) {
    parts.push("[지금까지의 조사]");
    log.forEach((e, i) => {
      const limit = i === log.length - 1 ? 8000 : 1200;
      let body = JSON.stringify(e.result);
      if (body.length > limit) body = body.slice(0, limit) + "…(생략)";
      parts.push(`${i + 1}. ${e.op}(${JSON.stringify(e.args || {})}) → ${body}`);
    });
  }
  parts.push("", `[남은 횟수] ${left}`, "", "JSON 하나로 답하라.");
  return parts.join("\n");
}

// run(seedName, { seeds, store, corpus, callModel, onStep, system })
async function run(seedName, { seeds, store, corpus, callModel, onStep, system }) {
  if (!system) throw new Error("system 프롬프트 미주입");
  const seed = seeds.seeds.find((s) => s.name === seedName);
  if (!seed) throw new Error("unknown seed: " + seedName);
  const scopeTables = Object.keys(seeds.store_scope).sort();

  const RA = (typeof module !== "undefined" && module.exports) ? require("./agent.js") : root.RenderAgent;
  const tools = RA.makeTools(store, corpus);
  const log = [];
  const seen = new Set();
  const trace = [];

  for (let t = 0; t < MAX_OPS; t++) {
    const left = MAX_OPS - t;
    const user = userPrompt(seed, scopeTables, log, left);
    const raw = await callModel({ system, user });
    let action;
    try {
      action = JSON.parse(RA.stripFences(raw));
    } catch (e) {
      trace.push({ kind: "parse_error", raw });
      if (onStep) await onStep({ kind: "parse_error", raw });
      continue;
    }

    if (action.action === "answer") {
      trace.push({ kind: "answer", ...action });
      if (onStep) await onStep({ kind: "answer", ...action });
      return { seed: seedName, answer: action, trace, ops: log.length };
    }

    if (action.action === "op") {
      const op = action.op, args = action.args || {};
      if (action.thinking && onStep) await onStep({ kind: "think", text: action.thinking });
      if (onStep) await onStep({ kind: "op_request", op, args });
      const key = op + ":" + JSON.stringify(args);
      let result;
      if (seen.has(key)) result = { note: "이미 같은 인자로 호출함(무시)" };
      else { seen.add(key); result = RA.dispatch(tools, op, null, args); }
      // dispatch(tools, op, cid, args) — Mapper 에는 cid 개념이 없어 null.
      // peek_orm/peek_profile 은 args {table, column} 으로 조회한다.
      log.push({ op, args, result });
      const step = { kind: "op", op, args, thinking: action.thinking, result };
      trace.push(step);
      if (onStep) await onStep({ kind: "op_done", op, args, result });
      continue;
    }

    trace.push({ kind: "unknown", action });
    if (onStep) await onStep({ kind: "unknown", action });
  }

  // 상한 도달 — 마지막 한 번 answer 요청
  const raw = await callModel({ system, user: userPrompt(seed, scopeTables, log, 0) });
  let action = null;
  try { action = JSON.parse(RA.stripFences(raw)); } catch (e) { /* noop */ }
  if (action && action.action === "answer") {
    trace.push({ kind: "answer", ...action });
    if (onStep) await onStep({ kind: "answer", ...action });
    return { seed: seedName, answer: action, trace, ops: log.length };
  }
  const forced = { action: "answer", scope: "not_db", mappings: [],
    data_note: "", confidence: "LOW", review_note: "상한 도달·미해소",
    needs_review: true, thinking: "강제 종결" };
  trace.push({ kind: "answer", ...forced, forced: true });
  if (onStep) await onStep({ kind: "answer", ...forced, forced: true });
  return { seed: seedName, answer: forced, trace, ops: log.length, forced: true };
}

const API = { MAX_OPS, seedText, userPrompt, run };
if (typeof module !== "undefined" && module.exports) module.exports = API;
else root.MapperAgent = API;

})(typeof window !== "undefined" ? window : globalThis);
