// ============================================================
// record_snapshot.js — 실제 모델로 전 컬럼 실행 → 스냅샷 녹화 + 결과 요약.
//
// 환경변수:
//   ANTHROPIC_KEY    : 필수
//   RENDER_MODEL     : 모델 (기본 claude-sonnet-4-6)
//   RENDER_PROMPT_ID : "balanced_v3" (기본) | "compact"
//                      balanced_v3 → v3 구조화 슬롯 (prompt-v3.js 의 BALANCED)
//                      compact     → agent.js 의 RENDER_SYS (v2 압축본)
//                      나머지 v2 변형은 prompts.js 가 브라우저 전용이라 노드에선 미지원.
//   RENDER_RAW_LOG   : "1" 이면 각 컬럼의 raw 모델 응답을 data/_raw_<cid>.txt 로 덤프.
//
// 산출물:
//   v3 : data/render-snapshot-data-v3.js  (window.RenderSnapshotV3)
//   v2 : data/render-snapshot-data.js     (window.RenderSnapshot)
//   두 파일은 독립적으로 존재. 각 파일은 mode 전용 탭에서만 로드됨.
//   헤더 메타: version·kind·mode·model·prompt_id·created + results.
//   data/_summary.json — 컬럼별 요약(아키타입·신뢰도·ops·dig·human·conflicts·v3 슬롯 채움).
// ============================================================
const fs = require("fs"), path = require("path");
global.window = {};
require("../data/signal-store.js");
require("../data/corpus-index.js");
const store = global.window.SIGNAL_STORE;
const corpus = global.window.CORPUS;
const Agent = require("../js/agent.js");
const PromptV3 = require("../js/prompt-v3.js");

const KEY = process.env.ANTHROPIC_KEY;
const MODEL = process.env.RENDER_MODEL || "claude-sonnet-4-6";
const PROMPT_ID = process.env.RENDER_PROMPT_ID || "balanced_v3";
const RAW_LOG = process.env.RENDER_RAW_LOG === "1";
if (!KEY) { console.error("ANTHROPIC_KEY 필요"); process.exit(1); }

const SUPPORTED = new Set(["balanced_v3", "compact"]);
if (!SUPPORTED.has(PROMPT_ID)) {
  console.error(`[오류] RENDER_PROMPT_ID="${PROMPT_ID}" 는 노드 측에서 지원 안 함. balanced_v3 또는 compact 만.`);
  process.exit(1);
}

const IS_V3 = PROMPT_ID === "balanced_v3";
const SYSTEM_PROMPT = IS_V3 ? PromptV3.BALANCED : null;  // null 이면 Agent.run 이 자체 RENDER_SYS 사용
const OUT_MODE = IS_V3 ? "v3" : "v2";
const OUT_FILE = IS_V3 ? "render-snapshot-data-v3.js" : "render-snapshot-data.js";
const OUT_GLOBAL = IS_V3 ? "RenderSnapshotV3" : "RenderSnapshot";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// raw 응답 누적 — 컬럼별. RAW_LOG 켜져 있으면 파일로 덤프.
const rawByCol = {};

async function callModel({ system, user }, cid) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: 2048, system, messages: [{ role: "user", content: user }] }),
      });
      if (res.status === 429 || res.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
      const d = await res.json();
      if (!d.content) throw new Error(JSON.stringify(d).slice(0, 200));
      const text = d.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
      if (cid && RAW_LOG) {
        rawByCol[cid] = rawByCol[cid] || [];
        rawByCol[cid].push(text);
      }
      return text;
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(1200);
    }
  }
}

// v3 슬롯 채움 — answer 에서 추출. v2 응답은 모두 false.
function v3Filled(a) {
  if (!a) return { cap: false, codedict: false, format: false, agg: false };
  const cap = a.capability;
  const codedict = a.codedict;
  const fmt = a.format;
  const agg = a.aggregation;
  return {
    cap: !!(cap && (cap.primary || (cap.alternatives && cap.alternatives.length > 0) || cap.reasoning)),
    codedict: Array.isArray(codedict) && codedict.length > 0,
    format: !!fmt,
    agg: !!(agg && (agg.additive || (agg.suggested && agg.suggested.length > 0) || (agg.observed_in_etl && agg.observed_in_etl.length > 0) || agg.reasoning)),
  };
}

(async () => {
  console.log(`[record_snapshot] mode=${OUT_MODE} prompt_id=${PROMPT_ID} model=${MODEL}`);
  console.log(`  출력: data/${OUT_FILE} (window.${OUT_GLOBAL})\n`);

  const cols = Object.keys(store.columns).sort();
  const snapshot = {};
  const summary = [];
  let parseErrTotal = 0;

  for (const cid of cols) {
    process.stdout.write(`▶ ${cid} … `);
    try {
      const runOpts = { store, corpus, callModel: (msg) => callModel(msg, cid) };
      if (SYSTEM_PROMPT) runOpts.system = SYSTEM_PROMPT;
      const out = await Agent.run(cid, runOpts);
      snapshot[cid] = { trace: out.trace, answer: out.answer, model: MODEL };

      const a = out.answer;
      const digOps = out.trace.filter((s) => s.kind === "op" && ["grep_code","read_file","find_refs"].includes(s.op)).length;
      const parseErrs = out.trace.filter((s) => s.kind === "parse_error").length;
      parseErrTotal += parseErrs;
      const filled = v3Filled(a);

      summary.push({
        cid,
        arch: store.columns[cid].archetype,
        conf: a.confidence,
        ops: out.ops,
        dig: digOps,
        human: !!(a.route_to_human && a.route_to_human.needed),
        conflicts: (a.conflicts || []).length,
        parse_errs: parseErrs,
        v3: filled,
        desc: a.description,
      });
      const slot = [filled.cap?"C":"-", filled.codedict?"D":"-", filled.format?"F":"-", filled.agg?"A":"-"].join("");
      console.log(`${a.confidence.padEnd(6)} ops=${out.ops} dig=${digOps} human=${a.route_to_human && a.route_to_human.needed ? "Y" : "-"} conflicts=${(a.conflicts||[]).length} v3=[${slot}] parse_err=${parseErrs}`);
    } catch (e) {
      console.log("ERROR " + e.message);
      summary.push({ cid, error: e.message });
    }
    await sleep(400);
  }

  // 스냅샷 헤더
  const header = {
    version: 1,
    kind: "render",
    mode: OUT_MODE,
    model: MODEL,
    prompt_id: PROMPT_ID,
    created: new Date().toISOString(),
    results: snapshot,
  };

  const outFile = path.join(__dirname, "..", "data", OUT_FILE);
  fs.writeFileSync(
    outFile,
    `// 생성됨: verify/record_snapshot.js — 실제 모델 녹화. window.${OUT_GLOBAL} 전역.\n` +
    `window.${OUT_GLOBAL} = ` + JSON.stringify(header, null, 2) + ";\n"
  );
  console.log(`\n=== 스냅샷 저장: ${cols.length}컬럼 → ${path.relative(process.cwd(), outFile)} ===`);
  console.log(`    mode=${OUT_MODE} prompt_id=${PROMPT_ID} model=${MODEL} parse_err_total=${parseErrTotal}`);

  // 결과 요약
  console.log("\n=== 결과 요약 ===");
  for (const s of summary) {
    if (s.error) { console.log(`  ${s.cid.padEnd(34)} ERROR ${s.error}`); continue; }
    const slot = [s.v3.cap?"C":"-", s.v3.codedict?"D":"-", s.v3.format?"F":"-", s.v3.agg?"A":"-"].join("");
    console.log(`  ${s.cid.padEnd(34)} [${(s.arch||"-").padEnd(14)}] ${s.conf.padEnd(6)} ops=${s.ops} dig=${s.dig} human=${s.human?"Y":"-"} cf=${s.conflicts} v3=[${slot}]`);
  }

  // v3 슬롯 채움 분포 (v3 모드일 때만 의미)
  if (IS_V3) {
    const filledCnt = { cap: 0, codedict: 0, format: 0, agg: 0 };
    let answered = 0;
    for (const s of summary) {
      if (s.error || !s.v3) continue;
      answered++;
      if (s.v3.cap) filledCnt.cap++;
      if (s.v3.codedict) filledCnt.codedict++;
      if (s.v3.format) filledCnt.format++;
      if (s.v3.agg) filledCnt.agg++;
    }
    console.log("\n=== v3 슬롯 채움 (응답 받은 컬럼 기준) ===");
    console.log(`  capability  : ${filledCnt.cap}/${answered}`);
    console.log(`  codedict    : ${filledCnt.codedict}/${answered}`);
    console.log(`  format      : ${filledCnt.format}/${answered}`);
    console.log(`  aggregation : ${filledCnt.agg}/${answered}`);
  }

  // 가설-핵심 컬럼 디스크립션
  console.log("\n=== 크럭스/floor 디스크립션 (육안 검증) ===");
  for (const s of summary) {
    if (["LOAN_APPL_HIST.LOAN_STAT_CD","CONTACT_LOG.CHNL_CD","LOAN_APPL_HIST.APLD_RATE","DEP_ACCT.PROD_CD"].includes(s.cid) && s.desc)
      console.log(`\n[${s.cid}]\n  ${s.desc}`);
  }

  fs.writeFileSync(path.join(__dirname, "..", "data", "_summary.json"), JSON.stringify(summary, null, 2));

  // raw 로그
  if (RAW_LOG) {
    for (const [cid, texts] of Object.entries(rawByCol)) {
      const safe = cid.replace(/[^\w.]/g, "_");
      fs.writeFileSync(path.join(__dirname, "..", "data", `_raw_${safe}.txt`), texts.join("\n\n--- TURN BOUNDARY ---\n\n"));
    }
    console.log(`\n[raw 로그] ${Object.keys(rawByCol).length} 컬럼의 raw 응답을 data/_raw_*.txt 로 덤프.`);
  }
})();
