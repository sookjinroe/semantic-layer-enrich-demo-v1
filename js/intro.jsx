// ============================================================
// intro.jsx — Render 에이전트 소개 화면.
//   누가 읽는가 / 조사 — 어떻게 아는가 / 권위와 연결 / 저작과 종료.
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
  function PipeRow({ tone, label, body }) {
    const isHere = tone === "here";
    const labelColor = isHere ? "var(--accent)" : (tone === "downstream" ? "var(--sig)" : "var(--dim)");
    const bg = isHere ? "rgba(224,178,71,0.06)" : "transparent";
    const border = isHere ? `1px solid var(--accent)66` : "1px solid transparent";
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "8px 12px", borderRadius: 6, background: bg, border }}>
        <span style={{ ...mono, fontSize: 12, color: labelColor, letterSpacing: "0.04em", width: 92, flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: 13.5, color: isHere ? "var(--text)" : "var(--muted)", lineHeight: 1.55, fontWeight: isHere ? 500 : 400 }}>{body}</span>
      </div>
    );
  }
  function PipeArrow({ note }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 12, minHeight: 18 }}>
        <span style={{ ...mono, fontSize: 12, color: "var(--dim)" }}>↓</span>
        {note && <span style={{ fontSize: 12, color: "var(--dim)", fontStyle: "italic" }}>{note}</span>}
      </div>
    );
  }
  function ToolInternal({ name, body }) {
    return (
      <div style={{ display: "flex", gap: 14, padding: "8px 0", borderTop: `1px solid ${RULE}` }}>
        <span style={{ ...mono, fontSize: 13, color: "var(--sig)", width: 110, flexShrink: 0, paddingTop: 1 }}>{name}</span>
        <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>{body}</span>
      </div>
    );
  }

  function RenderIntro() {
    return (
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "40px 28px 100px" }}>
        {/* 히어로 */}
        <Eyebrow>Render — 시맨틱 레이어 증강</Eyebrow>
        <h1 style={{ ...mono, fontSize: 32, fontWeight: 600, margin: "0 0 12px", letterSpacing: "-0.01em", color: "var(--text)" }}>
          Render 에이전트
        </h1>
        <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.6, margin: 0, maxWidth: 680 }}>
          DB 컬럼 하나에 대해, NL2SQL 에이전트가 SQL 생성에 <b style={{ color: "var(--text)" }}>검증 없이 그대로 쓸 구조화 슬롯</b>을 합성한다.
        </p>

        {/* 파이프라인 — Render 가 어디에 자리하는가 */}
        <div style={{ marginTop: 36, border: `1px solid ${RULE}`, borderRadius: 8, padding: "20px 22px", background: "var(--panel)" }}>
          <div style={{ ...mono, fontSize: 11.5, letterSpacing: "0.1em", color: "var(--dim)", marginBottom: 14 }}>파이프라인 속 자리</div>
          <div style={{ display: "grid", gap: 8 }}>
            <PipeRow tone="upstream" label="원자료" body="DB 스키마 · 코드 코퍼스 · 실데이터" />
            <PipeArrow note="빌드 프로세스 (build_signals · build_corpus)" />
            <PipeRow tone="upstream" label="재료" body={<><span style={mono}>signal_store</span> — ORM 파싱·profile·reftable  ·  <span style={mono}>CORPUS</span> — 코드 원문</>} />
            <PipeArrow />
            <PipeRow tone="here" label="Render 에이전트" body="컬럼 하나씩 슬롯 저작 (description · capability · codedict · format · aggregation · confidence · review_note · needs_review)" />
            <PipeArrow />
            <PipeRow tone="downstream" label="산출물" body="시맨틱 레이어 카탈로그 (컬럼당 슬롯 세트)" />
            <PipeArrow />
            <PipeRow tone="downstream" label="소비자" body="NL2SQL 에이전트 — 자연어 질문 → SQL" />
          </div>
          <div style={{ height: 1, background: RULE, margin: "18px 0 14px" }} />
          <div style={{ ...mono, fontSize: 11.5, letterSpacing: "0.1em", color: "var(--dim)", marginBottom: 8 }}>재료 규모 · Fineract 예시</div>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontSize: 13.5, color: "var(--muted)" }}>
            <div><b style={{ color: "var(--text)" }}>474</b> 컬럼</div>
            <div><b style={{ color: "var(--text)" }}>43</b> 코드 그룹</div>
            <div><b style={{ color: "var(--text)" }}>2,063</b> 파일 · <b style={{ color: "var(--text)" }}>~13MB</b> 코퍼스</div>
          </div>
        </div>

        {/* 1. 누가 읽는가 */}
        <SectionHead n="01" label="누가 읽는가 — 모든 판단의 기준" />
        <div style={{ border: `1px solid ${RULE}`, borderRadius: 8, padding: "18px 20px", background: "var(--panel)" }}>
          <div style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.7 }}>
            NL2SQL 에이전트는 자연어 질문을 SQL 로 바꾸면서 슬롯을 <b style={{ color: "var(--text)" }}>검증 없이 그대로</b> 쓴다.
            <span style={mono}> capability</span> 로 SQL 의 어느 자리에 넣을지 정하고, <span style={mono}>codedict</span> 로 "승인된 대출"을 <span style={mono}>WHERE stat_cd='03'</span> 으로 바꾸고,
            <span style={mono}> format</span> 으로 날짜 필터 문자열을 만들고, <span style={mono}>aggregation</span> 으로 SUM 인지 AVG 인지 정하고, <span style={mono}>description</span> 으로 비슷한 컬럼 중 어느 것을 쓸지 가른다.
          </div>
          <div style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.7, marginTop: 10 }}>
            슬롯이 비어 있으면 NL 은 모른다는 걸 알고 다른 경로를 찾는다. 틀린 값이 있으면 모른 채 조용히 틀린 SQL 을 낸다.
            그래서 이 일의 전부는 <b style={{ color: "var(--text)" }}>확인된 것은 담고, 확인 못 한 것은 비우고, 그 차이를 confidence 와 review_note 로 드러내는 것</b>이다.
          </div>

          <div style={{ height: 1, background: RULE, margin: "16px 0" }} />
          <div style={{ ...mono, fontSize: 11.5, letterSpacing: "0.1em", color: "var(--dim)", marginBottom: 9 }}>저작 슬롯</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["description", "capability", "codedict", "format", "aggregation", "confidence", "review_note", "needs_review"].map((x) =>
              <Chip key={x} color="var(--accent)">{x}</Chip>)}
          </div>

          <div style={{ height: 1, background: RULE, margin: "16px 0" }} />
          <div style={{ ...mono, fontSize: 11.5, letterSpacing: "0.1em", color: "var(--dim)", marginBottom: 9 }}>두 청중</div>
          <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>
            사람 검수자는 <span style={mono}>description</span> 과 <span style={mono}>codedict</span> 만 검수한다 — 이 둘이 비즈니스 언어이기 때문이다.
            <span style={mono}> capability</span> 와 <span style={mono}>aggregation</span> 은 기계 슬롯이라, 검수자에게는 <span style={mono}>review_note</span> 로 판단 근거만 전한다.
            <b style={{ color: "var(--text)" }}> needs_review=true</b> 는 NL 에게는 "이 컬럼 유보" 게이트이고, 검수자에게는 확인 요청이다 — 한 필드가 두 청중을 겸직한다.
          </div>
        </div>

        {/* 2. 조사 */}
        <SectionHead n="02" label="조사 — 어떻게 아는가" />
        <div style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 4 }}>
          이름과 타입은 <b style={{ color: "var(--text)" }}>가설</b>을 주지만 <b style={{ color: "var(--text)" }}>근거</b>를 주지는 않는다. 싼 신호부터 본다.
        </div>
        <TierLabel color="var(--sig)" title="싼 신호 — 미리 구축된 store 조회" note="결정적 전수. 먼저 쓴다." />
        <ToolGrid>
          <Tool name="peek_orm" color="var(--sig)"
                desc="파싱된 ORM — 필드명·타입·enum·join. enum 이 있으면 codedict 의 1차 권위. {table, column} 으로 다른 컬럼(FK 대상 등)도 조회한다." />
          <Tool name="peek_profile" color="var(--sig)"
                desc="실데이터 — distinct 값·추론 형식·null 비율. 컬럼이 실제로 어떤 값을 담는지는 여기서만 안다." />
          <Tool name="peek_reftable" color="var(--sig)"
                desc="전역 공통코드 표. 그룹 목록을 보고 {group:'이름'}으로 조회. 컬럼과의 연결은 선언돼 있지 않다 — 연결은 네가 세운다." />
        </ToolGrid>
        <TierLabel color="var(--lin)" title="코드 파기 — 조망 → 지도 → 조준" note="위 신호로 안 풀리는 라벨의 권위·값의 계보를 코드에서 찾는다." />
        <ToolGrid>
          <Tool name="list_files" args="{dir?, pattern?}" color="var(--lin)"
                desc="구조를 먼저 본다 — 조망. 어디에 무엇이 있는지 모른 채 검색부터 하지 않는다." />
          <Tool name="grep_code" args="{query, context?}" color="var(--lin)"
                desc="리터럴 부분일치(정규식 아님). 결과는 파일별 지도 — 매치 밀집이 유망하지만, 밀집이 곧 권위는 아니다(리포트는 사용만 많을 뿐이다)." />
          <Tool name="read_file" args="{path, from_line?, to_line?}" color="var(--lin)"
                desc="지도에서 고른 위치를 범위로 읽는다 — 조준. 큰 파일을 통째로 읽지 않는다." />
          <Tool name="find_refs" args="{symbol}" color="var(--lin)"
                desc="정의(선언)와 사용을 갈라서 준다. 정의를 찾을 때는 grep 보다 빠르다." />
        </ToolGrid>
        <div style={{ marginTop: 20, marginBottom: 9, ...mono, fontSize: 11.5, letterSpacing: "0.1em", color: "var(--dim)" }}>실측된 리듬</div>
        <div style={{ border: `1px solid ${RULE}`, borderRadius: 8, padding: "14px 16px", background: "var(--panel)" }}>
          <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.65 }}>
            대부분의 컬럼은 <span style={{ ...mono, color: "var(--sig)" }}>peek_orm</span> → <span style={{ ...mono, color: "var(--sig)" }}>peek_profile</span> 두 번만으로 끝난다 — 형태와 실물이 확인되면 슬롯을 채울 재료가 다 모인다. 코드 파기는 결손이 남는 소수 컬럼에만 들어가고, <b style={{ color: "var(--text)" }}>무엇이 부족한가에 따라 진입 도구가 갈린다</b>:
          </div>
          <div style={{ display: "grid", gap: 6, marginTop: 12, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55 }}>
            <div><span style={{ color: "var(--dim)" }}>—</span> 코드값이 공통코드 후보 → <span style={{ ...mono, color: "var(--sig)" }}>peek_reftable</span></div>
            <div><span style={{ color: "var(--dim)" }}>—</span> 라벨 권위·값의 계보를 찾아야 함 → <span style={{ ...mono, color: "var(--lin)" }}>list_files → grep_code → read_file</span></div>
            <div><span style={{ color: "var(--dim)" }}>—</span> 정의 위치를 특정해야 함 → <span style={{ ...mono, color: "var(--lin)" }}>find_refs</span></div>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55, marginTop: 12, fontStyle: "italic" }}>
            도구 사이 고정된 순서는 없다 — 결손이 무엇이냐에 따라 다음 도구가 정해진다. 이는 프롬프트에 명시된 규칙이 아니라 474 컬럼 실행에서 관찰된 시드 리듬이다.
          </div>
        </div>

        <div style={{ marginTop: 20, marginBottom: 9, ...mono, fontSize: 11.5, letterSpacing: "0.1em", color: "var(--dim)" }}>도구 내부 · 컨텍스트 규율</div>
        <div style={{ border: `1px solid ${RULE}`, borderRadius: 8, padding: "14px 16px", background: "var(--panel)" }}>
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 12 }}>
            에이전트가 매 턴마다 도구 결과를 다시 다 읽는다. 그래서 도구는 <b style={{ color: "var(--text)" }}>결과를 절단하고 이어읽기 힌트를 준다</b> — 규율이 프롬프트에만 있는 게 아니라 도구 층에도 있다.
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            <ToolInternal name="peek_*"
              body="signal_store 에서 미리 계산된 요약을 반환. 실시간 계산 아님 — 빌드 프로세스에서 파싱해둔 것을 조회만 한다." />
            <ToolInternal name="list_files"
              body={<>파일 60개 넘으면 파일 목록 대신 <b style={{ color: "var(--text) "}}>디렉토리별 카운트 요약</b>으로 대체. 컨텍스트 폭탄 방지.</>} />
            <ToolInternal name="grep_code"
              body={<>전 파일 리터럴 스캔. 파일별 지도로 반환 — <b style={{ color: "var(--text)" }}>상위 12개만 샘플, 다음 15개는 카운트만</b>, 나머지는 힌트로만. 각 샘플은 앞뒤 최대 4줄, 라인 160자 절단.</>} />
            <ToolInternal name="read_file"
              body={<>한 번에 <b style={{ color: "var(--text)" }}>최대 120줄</b>. 초과 시 절단하고 이어읽기 힌트(<span style={mono}>{`{from_line: to+1}`}</span> 로 재호출). 경로는 서픽스 매칭도 허용.</>} />
            <ToolInternal name="find_refs"
              body={<><b style={{ color: "var(--text)" }}>선언과 사용을 갈라서</b> 반환 — 정규식 휴리스틱으로 <span style={mono}>class/enum/interface/record</span> 뒤의 심볼은 선언, 나머지는 사용. 선언은 최대 10, 사용은 파일별 상위 12.</>} />
          </div>
        </div>

        <div style={{ marginTop: 14, padding: "11px 14px", border: `1px solid ${RULE}`, borderLeft: "3px solid var(--med)", borderRadius: 6, background: "var(--panel)", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55 }}>
          찾아도 없을 수 있다 — 코퍼스에 정의가 없는 컬럼이면 <b style={{ color: "var(--text)" }}>"없다"가 조사의 성과다.</b>
        </div>

        {/* 3. 권위와 연결 */}
        <SectionHead n="03" label="권위와 연결 — 가장 흔한 함정" />
        <div style={{ display: "grid", gap: 10 }}>
          <Principle accent="var(--accent)" lead="값 겹침 ≠ 권위"
            body='코드 어딘가에서 case "01":"접수" 를 찾았다고 그게 이 컬럼의 매핑인 건 아니다. 서로 다른 코드 체계가 같은 값 집합({01,02,03})을 흔히 쓴다. 연결로 확인하라 — 그 매핑이 이 컬럼의 ORM 필드명을 키로 쓰는가(switch(loanStatusCode))? 같은 도메인의 코드인가? 값만 겹치는 매핑을 채택하면 NL 이 남의 코드 체계로 이 컬럼을 필터링하게 된다.' />
          <Principle accent="var(--sig)" lead="권위에는 위계가 있다"
            body="enum·코드 선언(정의)이 1차 권위다. 리포트·뷰의 표시용 CASE 문은 정의를 베낀 2차 가공이라 틀리거나 남의 것일 수 있다. 정의를 우선하고, 표시용 매핑은 대조 자료로만 쓴다." />
          <Principle accent="var(--lin)" lead="불일치는 종결 신호가 아니다"
            body="찾은 매핑과 실데이터가 어긋나면(매핑에 없는 값이 데이터에 있거나 그 반대) 그 매핑은 불완전하거나 남의 것이다 — 이 불일치는 아직 진짜 권위를 못 찾았다는 신호다. 예산이 남았으면 다른 형태의 권위를 더 찾는다. 다 쓰고도 없으면 찾은 만큼 담고 미확인을 표시하는 것이 정직한 답이다." />
        </div>

        {/* 4. 저작과 종료 */}
        <SectionHead n="04" label="저작과 종료" />
        <div style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 12 }}>
          조사에서는 오늘의 데이터와 개발자의 코드를 보지만, 산출물은 <b style={{ color: "var(--text)" }}>데이터가 리프레시된 몇 달 뒤에도 읽힐 카탈로그 문서</b>이고 독자는 코드를 보지 않는 사람이다. 담기 전에 번역한다.
        </div>
        <div style={{ border: `1px solid ${RULE}`, borderRadius: 8, overflow: "hidden", background: "var(--panel)" }}>
          <SpecRow k="관측 → 성질">
            <span style={{ color: "var(--dim)" }}>"98%가 NULL"</span> 이 아니라 <b style={{ color: "var(--text)" }}>"상각 처리된 대출에만 채워진다"</b>. 수치는 성질의 근거일 때만 자리가 있다.
          </SpecRow>
          <SpecRow k="개발 어휘 → 업무 언어">
            cardinality·null_rate 는 독자에게 외국어다. <span style={{ color: "var(--dim)" }}>"distinct 값 1개"</span> 가 아니라 <b style={{ color: "var(--text)" }}>"모든 행이 같은 값"</b>.
          </SpecRow>
          <SpecRow k="confidence 3단">
            <b style={{ color: "var(--high)" }}>HIGH</b> 담은 단정이 다 확인 · <b style={{ color: "var(--med)" }}>MEDIUM</b> 일부 추정이거나 미확인 남음 · <b style={{ color: "var(--low)" }}>LOW</b> 정체부터 불확실.
          </SpecRow>
          <SpecRow k="needs_review 게이트">
            NL 이 잘못된 SQL 을 낼 <b style={{ color: "var(--text)" }}>실질 위험</b>이 있을 때만 <span style={mono}>true</span> — 핵심 슬롯(라벨·형식·역할)의 권위 미확인, 출처 충돌. 주변적 미확인(실물 대조 불가, 사용 이력 없음)은 review_note 에만 남기고 <span style={mono}>false</span>.
          </SpecRow>
          <SpecRow k="종료 조건">
            핵심 슬롯이 다 채워졌거나, 못 채운 슬롯을 확인할 <b style={{ color: "var(--text)" }}>수단이 더 없을 때</b>. 상한은 컬럼당 12연산.
          </SpecRow>
        </div>
      </div>
    );
  }

  window.RenderIntro = RenderIntro;
})();
