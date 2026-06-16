// ============================================================
// live-api.js — 브라우저에서 Anthropic API 직접 호출 (Render 라이브 모드).
//   키 해석: window.ANTHROPIC_KEY(local-config, gitignore) → localStorage(⚙ 입력).
//   브라우저 직접 호출 헤더 사용. callModel({system,user}) → 모델 텍스트.
//   window.RenderAPI 로 노출.
// ============================================================
window.RenderAPI = (function () {
  const MODELS = [
    { id: "claude-sonnet-4-6", label: "Sonnet 4.6" },
    { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
    { id: "claude-opus-4-8", label: "Opus 4.8" },
  ];

  function getKey() {
    if (window.ANTHROPIC_KEY) return window.ANTHROPIC_KEY;
    try { return localStorage.getItem("render_key") || ""; } catch (e) { return ""; }
  }
  function setKey(k) { try { localStorage.setItem("render_key", k); } catch (e) {} }
  function getModel() {
    try { return localStorage.getItem("render_model") || MODELS[0].id; } catch (e) { return MODELS[0].id; }
  }
  function setModel(m) { try { localStorage.setItem("render_model", m); } catch (e) {} }

  // 아티팩트 런타임은 키리스(런타임 주입). Pages 는 사용자 키 필요.
  async function callModel({ system, user }) {
    const key = getKey();
    const headers = {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    };
    if (key) headers["x-api-key"] = key;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: getModel(),
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    return (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }

  return { MODELS, getKey, setKey, getModel, setModel, callModel };
})();
