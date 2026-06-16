// record_snapshot.js — 실제 모델로 전 컬럼 실행 → 스냅샷 녹화 + 결과 요약.
// 키는 환경변수에서만. 커밋되는 건 스냅샷(트레이스)뿐.
const fs = require("fs"), path = require("path");
global.window = {};
require("../data/signal-store.js");
require("../data/corpus-index.js");
const store = global.window.SIGNAL_STORE;
const corpus = global.window.CORPUS;
const Agent = require("../js/agent.js");

const KEY = process.env.ANTHROPIC_KEY;
const MODEL = process.env.RENDER_MODEL || "claude-sonnet-4-6";
if (!KEY) { console.error("ANTHROPIC_KEY 필요"); process.exit(1); }

async function callModel({ system, user }) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, messages: [{ role: "user", content: user }] }),
      });
      if (res.status === 429 || res.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
      const d = await res.json();
      if (!d.content) throw new Error(JSON.stringify(d).slice(0, 200));
      return d.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(1200);
    }
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const cols = Object.keys(store.columns).sort();
  const snapshot = {};
  const summary = [];
  for (const cid of cols) {
    process.stdout.write(`\n▶ ${cid} … `);
    try {
      const out = await Agent.run(cid, { store, corpus, callModel });
      snapshot[cid] = { trace: out.trace, model: MODEL };
      const a = out.answer;
      const digOps = out.trace.filter((s) => s.kind === "op" && ["grep_code","read_file","find_refs"].includes(s.op)).length;
      summary.push({ cid, arch: store.columns[cid].archetype, conf: a.confidence, ops: out.ops,
        dig: digOps, human: !!(a.route_to_human && a.route_to_human.needed),
        conflicts: (a.conflicts || []).length, desc: a.description });
      console.log(`${a.confidence} ops=${out.ops} dig=${digOps} human=${a.route_to_human && a.route_to_human.needed ? "Y" : "-"} conflicts=${(a.conflicts||[]).length}`);
    } catch (e) {
      console.log("ERROR " + e.message);
      summary.push({ cid, error: e.message });
    }
    await sleep(400);
  }

  const out = path.join(__dirname, "..", "data", "render-snapshot-data.js");
  fs.writeFileSync(out, "// 생성됨: verify/record_snapshot.js — 실제 모델 녹화. window.RenderSnapshot 전역.\n" +
    "window.RenderSnapshot = " + JSON.stringify(snapshot, null, 2) + ";\n");
  console.log(`\n\n=== 스냅샷 저장: ${cols.length}컬럼 → ${path.normpath ? path.normpath(out) : out} ===\n`);

  console.log("=== 결과 요약 ===");
  for (const s of summary) {
    if (s.error) { console.log(`  ${s.cid.padEnd(30)} ERROR ${s.error}`); continue; }
    console.log(`  ${s.cid.padEnd(30)} [${s.arch.padEnd(14)}] ${s.conf.padEnd(6)} ops=${s.ops} dig=${s.dig} human=${s.human?"Y":"-"} conf=${s.conflicts}`);
  }
  // 가설-핵심 컬럼 디스크립션 출력
  console.log("\n=== 크럭스/floor 디스크립션 (육안 검증) ===");
  for (const s of summary) {
    if (["LOAN_APPL_HIST.LOAN_STAT_CD","CONTACT_LOG.CHNL_CD","LOAN_APPL_HIST.APLD_RATE","DEP_ACCT.PROD_CD"].includes(s.cid) && s.desc)
      console.log(`\n[${s.cid}]\n  ${s.desc}`);
  }
  fs.writeFileSync(path.join(__dirname, "..", "data", "_summary.json"), JSON.stringify(summary, null, 2));
})();
