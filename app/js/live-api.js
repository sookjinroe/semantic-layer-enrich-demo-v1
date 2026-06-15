// ============================================================
// live-api.js — 모델 호출 래퍼. RenderAPI.complete(system, user, {onRetry}) → JSON.
// (NL 앱 js/live-api.js 패턴을 그대로 정렬: 키 3단 해석 + 모델 피커 + 재시도)
// 키 해석 순서: window.ANTHROPIC_KEY(local-config.js, gitignore) → .env → localStorage.
// 키는 리포에 절대 넣지 않는다 — public 리포의 키는 시크릿 스캐닝으로 자동 비활성화됨.
// 모델: setModel/getModel, localStorage 'render_model' 에 유지.
// ============================================================
window.RenderAPI = (function () {
  // .env 로더 — 리포 루트의 .env(gitignore)에서 ANTHROPIC_API_KEY 를 읽는다.
  // 로컬 실행용: Pages에는 .env가 배포되지 않으므로 조용히 폴백.
  const ENV_READY = (async () => {
    try {
      const r = await fetch("../.env", { cache: "no-store" });
      if (r.ok) {
        const t = await r.text();
        const m = t.match(/^\s*ANTHROPIC_API_KEY\s*=\s*["']?(sk-ant-[A-Za-z0-9_\-]+)/m);
        if (m && !window.ANTHROPIC_KEY) window.ANTHROPIC_KEY = m[1];
      }
    } catch (e) {}
  })();

  const MODELS = [
    { id: "claude-haiku-4-5",  label: "Haiku 4.5 · 빠름/저렴" },
    { id: "claude-sonnet-4-6", label: "Sonnet 4.6 · 기본" },
    { id: "claude-opus-4-8",   label: "Opus 4.8 · 고성능" },
    { id: "claude-fable-5",    label: "Fable 5 · 최상위" },
  ];
  const DEFAULT_MODEL = "claude-sonnet-4-6";

  function getModel() {
    const m = localStorage.getItem("render_model");
    return MODELS.some((x) => x.id === m) ? m : DEFAULT_MODEL;
  }
  function setModel(id) { try { localStorage.setItem("render_model", id); } catch (e) {} }
  function getKey() {
    return (typeof window !== "undefined" && window.ANTHROPIC_KEY) ||
           (function(){ try { return localStorage.getItem("anthropic_key"); } catch(e){ return null; } })() ||
           null;
  }
  function setKey(k) { try { localStorage.setItem("anthropic_key", k || ""); } catch (e) {} }
  function hasKey() { return !!getKey(); }

  function stripFence(t) {
    return t.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  }
  function parseJson(text) {
    const t = stripFence(text);
    try { return JSON.parse(t); } catch (e) {}
    const s = t.indexOf("{");
    if (s >= 0) {
      let depth = 0;
      for (let i = s; i < t.length; i++) {
        if (t[i] === "{") depth++;
        else if (t[i] === "}") { depth--; if (depth === 0) { try { return JSON.parse(t.slice(s, i + 1)); } catch (e) { break; } } }
      }
    }
    throw new Error("JSON 파싱 실패: " + t.slice(0, 120));
  }

  async function complete(system, user, opts) {
    await ENV_READY;
    const { onRetry } = opts || {};
    const headers = { "Content-Type": "application/json" };
    const key = getKey();
    if (key) {                                   // Pages/standalone: 사용자 키로 브라우저 직접 호출
      headers["x-api-key"] = key;
      headers["anthropic-version"] = "2023-06-01";
      headers["anthropic-dangerous-direct-browser-access"] = "true";
    }                                            // 아티팩트 런타임: 키 없이(런타임이 인증 주입)
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", headers,
          body: JSON.stringify({ model: getModel(), max_tokens: 1000,
            system, messages: [{ role: "user", content: user }] }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
        return parseJson(text);
      } catch (e) {
        lastErr = e;
        const delay = 800 * Math.pow(2, attempt - 1);
        if (onRetry) onRetry(attempt, delay, e);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastErr;
  }

  return { complete, MODELS, getModel, setModel, getKey, setKey, hasKey, ready: ENV_READY };
})();
