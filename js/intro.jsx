// ============================================================
// intro.jsx — Render 에이전트 소개 화면.
//   정체와 역할 / 쓰는 도구 / 행동지침(어떻게) / 루프 종료와 트리거.
//   앱 디자인 토큰(--accent·--sig·--lin·--panel·--rule, IBM Plex)에 맞춤.
// window.RenderIntro 로 노출.
// ============================================================
(function () {
  const mono = { fontFamily: "var(--mono)" };
  const RULE = "var(--rule)";

  function Eyebrow({ children }) {
    return (
      <div style={{ ...mono, fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase",
                    color: "var(--muted)", marginBottom: 14 }}>{children}</div>
    );
  }
  function SectionHead({ n, label }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 13, margin: "46px 0 18px" }}>
        <span style={{ ...mono, fontSize: 13, color: "var(--accent)" }}>{n}</span>
        <span style={{ ...mono, fontSize: 15, letterSpacing: "0.04em", color: "var(--text)" }}>{label}</span>
        <span style={{ flex: 1, height: 1, background: RULE }} />
      </div>
    );
  }
  function Tool({ name, args, tag, tagColor, color, desc }) {
    return (
      <div style={{ border: `1px solid ${RULE}`, borderRadius: 7, padding: "12px 14px", background: "var(--panel)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ ...mono, fontSize: 14.5, color: color || "var(--sig)", fontWeight: 500 }}>{name}</span>
          {args && <span style={{ ...mono, fontSize: 12, color: "var(--faint)" }}>{args}</span>}
          {tag && (
            <span style={{ ...mono, fontSize: 10.5, color: tagColor, border: `1px solid ${tagColor}66`,
                           borderRadius: 4, padding: "1px 6px", marginLeft: "auto" }}>{tag}</span>
          )}
        </div>
        <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55 }}>{desc}</div>
      </div>
    );
  }
  function ToolGrid({ children }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: 10, marginTop: 10 }}>{children}</div>
    );
  }
  function TierLabel({ color, title, note }) {
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginTop: 18 }}>
        <span style={{ width: 8, height: 8, borderRadius: 8, background: color, transform: "translateY(-1px)" }} />
        <span style={{ ...mono, fontSize: 13.5, color: "var(--text)" }}>{title}</span>
        <span style={{ fontSize: 13, color: "var(--dim)" }}>{note}</span>
      </div>
    );
  }
  function Principle({ accent, lead, body }) {
    return (
      <div style={{ border: `1px solid ${RULE}`, borderLeft: `3px solid ${accent}`, borderRadius: 6,
                    padding: "13px 16px", background: "var(--panel)" }}>
        <div style={{ fontSize: 15, color: "var(--text)", fontWeight: 600, marginBottom: 5 }}>{lead}</div>
        <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>{body}</div>
      </div>
    );
  }
  function SpecRow({ k, children, last }) {
    return (
      <div style={{ display: "flex", gap: 16, padding: "11px 14px",
                    borderTop: `1px solid ${RULE}` }}>
        <span style={{ ...mono, fontSize: 12, color: "var(--dim)", width: 124, flexShrink: 0, paddingTop: 1 }}>{k}</span>
        <span style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.55 }}>{children}</span>
      </div>
    );
  }
  function Chip({ color, children }) {
    return (
      <span style={{ ...mono, fontSize: 12, color, border: `1px solid ${color}55`, borderRadius: 4,
                     padding: "3px 8px", whiteSpace: "nowrap" }}>{children}</span>
    );
  }

  function RenderIntro() {
    return (
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "40px 28px 100px" }}>
        {/* 히어로 */}
        <Eyebrow>Render · v2 — 시맨틱 레이어 증강</Eyebrow>
        <h1 style={{ ...mono, fontSize: 32, fontWeight: 600, margin: "0 0 12px", letterSpacing: "-0.01em", color: "var(--text)" }}>
          Render 에이전트
        </h1>
        <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.6, margin: 0, maxWidth: 680 }}>
          DB 컬럼 하나에 대해, NL2SQL 에이전트가 나중에 소비할 <b style={{ color: "var(--text)" }}>비즈니스 Description</b>을 합성한다.
        </p>

        {/* 1. 정체와 역할 */}
        <SectionHead n="01" label="정체와 역할" />
        <div style={{ border: `1px solid ${RULE}`, borderRadius: 8, padding: "18px 20px", background: "var(--panel)" }}>
          <div style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.7 }}>
            가설은 <b style={{ color: "var(--text)" }}>부산물 신호(스키마·코드·데이터·reftable)만으로 라벨 권위를 검증 가능하게 근거 지을 수 있는가</b>이다.
            라벨을 '찾는' 것이 아니라, 찾은 매핑이 이 컬럼의 권위인지 '검증'하는 것이 본령이다.
          </div>
          <div style={{ height: 1, background: RULE, margin: "16px 0" }} />
          <div style={{ ...mono, fontSize: 11.5, letterSpacing: "0.1em", color: "var(--dim)", marginBottom: 9 }}>소유 경계</div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 7 }}>저작한다</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["description", "confidence", "evidence", "conflicts", "route_to_human"].map((x) =>
                  <Chip key={x} color="var(--accent)">{x}</Chip>)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 7 }}>읽기만 한다 <span style={{ color: "var(--dim)" }}>· 추출 소유</span></div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["codedict", "classification", "format"].map((x) =>
                  <Chip key={x} color="var(--dim)">{x}</Chip>)}
              </div>
            </div>
          </div>
        </div>

        {/* 2. 쓰는 도구 */}
        <SectionHead n="02" label="쓰는 도구 · 두 티어" />
        <TierLabel color="var(--sig)" title="tier-1 — 미리 구축된 store 조회" note="쌈 · 결정적 전수. 먼저 쓴다." />
        <ToolGrid>
          <Tool name="peek_orm" color="var(--sig)"
                desc="파싱된 ORM — 필드명·타입·enum·어노테이션·format·join·deprecated. enum이 있으면 라벨을 직접 준다. 연결 검증의 키가 여기 있다." />
          <Tool name="peek_profile" color="var(--sig)"
                desc="데이터 프로파일 — 값공간 distinct·형식·카디널리티·null율. 값공간과 형식은 여기서 얻는다." />
          <Tool name="peek_reftable" color="var(--sig)"
                desc="전역 공통코드 덤프(그룹별 코드→라벨). 단 이 컬럼과의 연결은 미선언 — 값집합 매칭/코드 탐색으로 직접 이어야 한다." />
        </ToolGrid>
        <TierLabel color="var(--lin)" title="tier-2 — 코드 코퍼스 dig" note="비쌈 · 정적 신호로 안 풀릴 때만." />
        <ToolGrid>
          <Tool name="grep_code" args="{query}" color="var(--lin)"
                desc="코퍼스 전문 검색 → {file, line, text} 목록." />
          <Tool name="read_file" args="{path}" color="var(--lin)"
                desc="파일 전문 읽기 — 라벨·계보의 맥락 확인." />
          <Tool name="find_refs" args="{symbol}" color="var(--lin)"
                desc="식별자 참조 위치 추적 — 컬럼명에서 출발해 타고 들어가 연결을 검증한다." />
        </ToolGrid>

        {/* 3. 행동지침 */}
        <SectionHead n="03" label="행동지침 · 어떻게 움직이는가" />
        <div style={{ display: "grid", gap: 10 }}>
          <Principle accent="var(--accent)" lead="자율적이되 비용 규율이 있는 점증 탐색"
            body="고정 파이프라인이 아니다. 싼 tier-1부터 쓰고, 결손이 남을 때만 비싼 tier-2 dig로 노력을 끌어올린다 — 게으른(frugal) 에스컬레이션." />
          <Principle accent="var(--sig)" lead="기본 태도는 회의(懷疑)와 검증"
            body="값집합이 겹친다고 받아들이지 않는다. 그 매핑이 이 컬럼의 권위인지(ORM 필드명 연결·같은 도메인) 확인될 때까지 단정하지 않고, 이름·값 일치 같은 표면 신호는 검증 전엔 추정으로만 다룬다." />
          <Principle accent="var(--lin)" lead="불확실성은 한정하거나 넘긴다"
            body="검증이 안 되면 단정 대신 한정(hedge), 후보가 여럿이면 conflicts에 기록, 권위가 없으면 route_to_human으로 사람에게 넘긴다. 모르더라도 '불명'으로 붕괴하지 않고 잔여 정보를 최대화한다." />
        </div>

        {/* 4. 루프 종료와 트리거 */}
        <SectionHead n="04" label="루프 종료와 트리거" />
        <div style={{ border: `1px solid ${RULE}`, borderRadius: 8, overflow: "hidden", background: "var(--panel)" }}>
          <div style={{ padding: "11px 14px", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55 }}>
            매니페스트 시드로 시작해, 결손이 남는 동안만 도구를 호출하는 need-loop. JSON 하나씩만 출력한다.
          </div>
          <SpecRow k="진입(시드)">대상 컬럼 스키마 + 당길 수 있는 tier-1 신호 목록(매니페스트) → 결손이 남으면 tier-2 dig.</SpecRow>
          <SpecRow k="종료 액션"><span style={mono}>answer</span> — description·confidence·evidence·conflicts·route_to_human.</SpecRow>
          <SpecRow k="연산 상한">컬럼당 12연산 · 남은 횟수 0이면 반드시 answer.</SpecRow>
          <SpecRow k="중복 가드">같은 op를 같은 인자로 반복하면 무시된다.</SpecRow>
          <SpecRow k="실패 트리거">JSON 파싱 실패 시 기록 후 한 번 더 기회(루프 계속).</SpecRow>
        </div>
      </div>
    );
  }

  window.RenderIntro = RenderIntro;
})();
