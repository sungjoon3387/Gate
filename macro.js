/* ============================================================
   Gate — macro (판정 + 계좌 번역 + 확인 일정 + 상세)

   화면 구성
     1. 오늘의 판정   — 한 줄 결론 + 근거 3줄. 매일 자동
     2. 내 계좌로 번역 — 지표를 원화 금액으로. 매일 자동
     3. 다음 확인 일정 — 예측이 아니라 달력. 아래 EVENTS 수동
     4~6. 접힌 상세   — 인과 사슬 / 지표 전체 / 분기 맥락

   수동 갱신은 EVENTS 와 CONTEXT 두 곳뿐입니다.
   ============================================================ */

window.MACRO_CONTEXT = {
  updated: "2026-09-15",
  note: "분기 1회 갱신. 판정에는 연결하지 않습니다 — 배경 이해용입니다.",

  // 지난 이벤트는 자동으로 숨겨집니다. approx:true 는 날짜 미확정.
  events: [
    { date: "2026-09-16", title: "FOMC 결정 · 점도표",
      watch: "인상 여부보다 점도표의 내년 경로. 이미 인상은 대부분 반영돼 있어 '한 번 더'가 있는지가 관건" },
    { date: "2026-09-18", title: "일본은행 금융정책결정회의",
      watch: "정책금리보다 일본 10년물이 3%에서 더 가는지, 그리고 엔화가 급등하는지. 급등이면 캐리 청산 국면" },
    { date: "2026-10-22", approx: true, title: "GE 버노바 3분기 실적",
      watch: "가스터빈 수주잔고 125GW 목표 진도. 시장 기대는 130~140GW라 목표 달성만으로는 실망 재료" },
    { date: "2026-10-28", approx: true, title: "Eaton 3분기 실적",
      watch: "미주 book-to-bill 1.2 유지 여부, Electrical Americas 마진 순차 개선" },
    { date: "2026-10-30", approx: true, title: "HD현대일렉트릭 3분기 실적",
      watch: "상향한 연간 수주목표 51.85억 달러 대비 진도율" }
  ],

  blocks: [
    { region: "중동", weight: "높음 — 직접 경로",
      text: "오일머니가 유가·인플레 경로가 아니라 AI 인프라 직접투자 경로로 들어옵니다. 국부펀드가 미국 데이터센터에 자본을 대면 그건 곧 ETN·GEV의 수주 파이프라인입니다. 유가보다 SWF 투자 발표를 봐야 합니다.",
      watch: "사우디 PIF·UAE 관련 미국 데이터센터 투자 발표, 브렌트유" },
    { region: "중국", weight: "낮음 — 인과가 길다",
      text: "미국채 보유 축소 → 장기금리 경로는 TIC 데이터가 2개월 지연되고 노이즈가 큽니다. 전력기기도 북미 시장은 사실상 차단돼 영향이 제한적입니다. 판정에는 쓰지 않습니다.",
      watch: "구리 가격, 위안화, TIC 보고서" },
    { region: "한국", weight: "중간 — 환율 수급",
      text: "원/달러를 실제로 움직이는 국내 변수는 금리차보다 수급입니다. 국민연금 해외투자와 환헤지 비율 조정, 서학개미 순매수, 경상수지가 축입니다.",
      watch: "국민연금 기금운용본부 공시(분기), 예탁결제원 세이브로 순매수" }
  ]
};

(function () {
  "use strict";
  var C = window.MACRO_CONTEXT;
  var M = null, D = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function won(n) {
    if (n == null) return "—";
    return Math.round(n).toLocaleString("ko-KR") + "원";
  }
  function num(v, u) {
    if (v == null) return "-";
    return (Math.round(v * 1000) / 1000).toLocaleString("ko-KR") + (u || "");
  }
  function sgn(v, u) {
    if (v == null) return "-";
    return (v > 0 ? "+" : "") + (Math.round(v * 1000) / 1000) + (u || "");
  }

  /* ---------- 1. 판정 ---------- */

  function pos52(d) {                       // 52주 범위 내 위치 0~100
    if (!d || d.min_1y == null || d.max_1y == null) return null;
    var r = d.max_1y - d.min_1y;
    if (!r) return null;
    return (d.value - d.min_1y) / r * 100;
  }

  function judge() {
    var i = M.indicators || {};
    var fxp = pos52(i.usdkrw);
    var ig = i.ig, r10 = i.real10;
    var out = { lines: [], head: "" };

    // (1) 달러 매수 유불리
    var dollarGood = null;
    if (fxp != null) {
      if (fxp <= 25) {
        dollarGood = true;
        out.lines.push({ t: "달러 사기 좋은 자리",
          d: "원/달러 " + num(i.usdkrw.value) + "원 — 52주 범위의 아래쪽 " + Math.round(fxp) + "%. 같은 논거라면 이번 매수는 달러 자산으로." });
      } else if (fxp >= 75) {
        dollarGood = false;
        out.lines.push({ t: "달러 사기 나쁜 자리",
          d: "원/달러 " + num(i.usdkrw.value) + "원 — 52주 범위의 위쪽 " + Math.round(fxp) + "%. 같은 논거라면 원화 종목이 환 부담이 적습니다." });
      } else {
        out.lines.push({ t: "환율은 중립",
          d: "원/달러 " + num(i.usdkrw.value) + "원 — 52주 범위 중간. 통화 선택이 수익률을 좌우하는 국면은 아닙니다." });
      }
    }

    // (2) 캐펙스 논거 생사 — 전력기기 3종목의 목숨줄
    var capexAlive = null;
    if (ig) {
      var d60 = ig.chg_60d;
      if (d60 >= 0.25) {
        capexAlive = false;
        out.lines.push({ t: "전력기기 논거 — 경고", warn: 1,
          d: "회사채 스프레드가 60일간 " + sgn(d60) + "%p 벌어졌습니다. 기업이 돈 빌리기 어려워지는 중이고, 데이터센터 발주가 실제로 줄 수 있는 유일한 경로입니다. 논거 재검토 시점." });
      } else if (d60 >= 0.10) {
        capexAlive = true;
        out.lines.push({ t: "전력기기 논거 — 관찰", watch: 1,
          d: "회사채 스프레드 60일 " + sgn(d60) + "%p. 아직 경고는 아니지만 방향이 나쁩니다." });
      } else {
        capexAlive = true;
        out.lines.push({ t: "전력기기 논거 유지",
          d: "회사채 스프레드 60일 " + sgn(d60) + "%p, 5년 기준 하위 " + ig.pctile_5y + "%. 국채금리는 올랐는데 기업 조달은 안 나빠졌습니다. ETN·GEV·HD현대일렉의 수주 논거는 아직 깨지지 않았습니다." });
      }
    }

    // (3) QQQ 약세의 성격 — 금리 탓인가 경기 탓인가
    if (r10) {
      if (r10.pctile_5y >= 80 && capexAlive) {
        out.lines.push({ t: "QQQ 약세는 실적이 아니라 금리",
          d: "실질금리 " + num(r10.value, "%") + " — 5년 최고 수준. 같은 이익에 매기는 값이 깎인 것이지 이익이 꺾인 게 아닙니다. 코어 적립은 그대로." });
      } else if (!capexAlive) {
        out.lines.push({ t: "QQQ 약세의 성격이 바뀌는 중", warn: 1,
          d: "금리와 신용 스프레드가 같이 오르고 있습니다. 밸류에이션 문제를 넘어 경기 쪽 신호일 수 있습니다." });
      }
    }

    // 한 줄 결론
    var a = dollarGood === true ? "달러 사기 좋고" : dollarGood === false ? "원화 쪽이 유리하고" : "환율은 중립이고";
    var b = capexAlive === false ? "전력기기 논거는 흔들리는 중" : "전력기기 논거는 살아 있다";
    out.head = a + ", " + b;
    return out;
  }

  /* ---------- 2. 내 계좌로 번역 ---------- */

  function translate() {
    if (!D || !window.HOLDINGS) return "";
    var Q = D.quotes || {}, H = window.HOLDINGS;
    var fxq = Q["KRW=X"];
    if (!fxq) return "";
    var fx = fxq.price;

    var usd = 0;
    (H.positions || []).forEach(function (p) {
      var q = Q[p.sym];
      if (!q || q.ccy !== "USD" || q.price == null) return;
      usd += q.price * p.shares;
    });
    if (!usd) return "";

    var i = M.indicators || {};
    var k = i.usdkrw;
    if (!k || k.chg_60d == null) return "";

    var d60 = -k.chg_60d;          // 60일 전 대비 환율이 얼마나 낮아졌나
    var d20 = k.chg_20d == null ? null : -k.chg_20d;
    var g60 = usd * d60;
    var g20 = d20 == null ? null : usd * d20;

    var h = '<div class="gm-h">내 계좌로 번역하면</div><div class="gm-box">';
    h += '<div class="gm-tr"><div class="l">달러 자산 규모</div><div class="v">$' +
      Math.round(usd).toLocaleString("en-US") + "</div>" +
      '<div class="d">현재 환율 ' + num(fx) + "원 기준 " + won(usd * fx) + "</div></div>";

    if (g60 > 0) {
      h += '<div class="gm-tr"><div class="l">60일 전 환율이었다면</div><div class="v gm-up">' +
        won(usd * fx + g60) + "</div>" +
        '<div class="d">지금보다 <b>' + won(g60) + " 더 높았습니다</b> — 주가와 무관하게 환율만으로 깎인 금액</div></div>";
    } else if (g60 < 0) {
      h += '<div class="gm-tr"><div class="l">60일 전 환율이었다면</div><div class="v gm-dn">' +
        won(usd * fx + g60) + "</div>" +
        '<div class="d">지금보다 <b>' + won(-g60) + " 낮았습니다</b> — 환율이 평가액을 밀어올린 금액</div></div>";
    }
    if (g20 != null && Math.abs(g20) > 10000) {
      h += '<div class="gm-tr"><div class="l">최근 20일 환율 효과</div><div class="v ' +
        (g20 > 0 ? "gm-up" : "gm-dn") + '">' + (g20 > 0 ? "−" : "+") + won(Math.abs(g20)) + "</div>" +
        '<div class="d">' + (g20 > 0 ? "원화 강세로 평가액이 줄었습니다" : "원화 약세로 평가액이 늘었습니다") + "</div></div>";
    }
    h += '<p class="gm-note">환율 손익은 팔기 전까지 확정되지 않습니다. 원화로 환산한 숫자가 나빠 보여도 달러 기준 주가는 다를 수 있습니다 — 보유 탭의 주가·환율 분해와 같이 보세요.</p>';
    return h + "</div>";
  }

  /* ---------- 3. 다음 확인 일정 ---------- */

  function calendar() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var rows = (C.events || []).map(function (e) {
      var d = new Date(e.date + "T00:00:00+09:00");
      return { e: e, dd: Math.round((d - today) / 864e5) };
    }).filter(function (r) { return r.dd >= -1; })
      .sort(function (a, b) { return a.dd - b.dd; })
      .slice(0, 4);
    if (!rows.length) return "";

    var h = '<div class="gm-h">다음 확인 일정</div><div class="gm-box">';
    rows.forEach(function (r) {
      var tag = r.dd <= 0 ? "오늘" : "D-" + r.dd;
      h += '<div class="gm-ev"><div class="t"><span class="dd' + (r.dd <= 3 ? " near" : "") + '">' +
        tag + "</span>" + esc(r.e.title) + (r.e.approx ? ' <span class="ap">날짜 예상</span>' : "") + "</div>";
      h += '<div class="w">볼 것 · ' + esc(r.e.watch) + "</div></div>";
    });
    h += '<p class="gm-note">Gate는 앞일을 맞히지 않습니다. 언제 무엇을 확인하면 내 논거가 맞았는지 알 수 있는지만 적어둡니다.</p>';
    return h + "</div>";
  }

  /* ---------- 4~6. 접힌 상세 ---------- */

  function vclass(v) {
    if (!v) return "";
    if (/경고/.test(v)) return "warn";
    if (/관찰|소폭|역풍|스티프닝/.test(v)) return "watch";
    return "ok";
  }

  var PLAIN = {
    curve: "돈을 빌리는 기간마다 이자가 다릅니다. 지금은 2~5년짜리 이자가 30년짜리보다 빠르게 오르고 있습니다. 30년이 앞장섰다면 '나라 빚이 걱정된다'는 뜻이라 훨씬 나쁜 신호인데, 짧은 쪽이 앞장선 건 '연준이 곧 금리를 올릴 것 같다'는 뜻입니다.",
    capex: "데이터센터는 현금이 아니라 빌린 돈으로 짓습니다. 그래서 중요한 건 국채금리가 아니라 '기업이 빌릴 때 얹어내는 웃돈'입니다. 이 웃돈이 그대로면 금리가 올라도 공사는 계속됩니다. 웃돈이 뛰면 그때 발주가 멈추고, 성준님 전력기기 3종목이 동시에 흔들립니다.",
    japan: "일본은 30년간 이자가 0이었습니다. 그래서 전 세계 투자자가 엔을 싸게 빌려 다른 나라 자산을 샀습니다. 이걸 엔 캐리라고 합니다. 이제 일본 금리가 오르면 빌린 돈을 갚아야 하고, 갚으려면 사뒀던 자산을 팔아야 합니다. 그게 전 세계에서 동시에 일어나는 게 캐리 청산입니다. 성준님은 일본 주식이 없지만 QQQ와 환율을 통해 영향을 받습니다.",
    fx: "해외주식은 달러로 사서 원화로 평가됩니다. 주가가 그대로여도 원화가 강해지면 계좌 숫자는 줄어듭니다. 지금이 그 구간입니다. 반대로 지금 새로 사는 달러는 싸게 사는 셈입니다."
  };

  function details(doc) {
    var h = "";
    h += '<details class="gm-d"><summary>인과 사슬 — 왜 그런 판정인가</summary>';
    (doc.chains || []).forEach(function (c) {
      h += '<div class="gm-chain"><h4>' + esc(c.title) + "</h4>";
      h += '<div class="gm-path">' + esc(c.path) + "</div>";
      if (c.verdict) h += '<span class="gm-v ' + vclass(c.verdict) + '">' + esc(c.verdict) + "</span>";
      h += "<p>" + esc(c.text) + "</p>";
      if (PLAIN[c.id]) h += '<div class="gm-plain"><b>쉽게 말하면</b>' + esc(PLAIN[c.id]) + "</div>";
      h += "</div>";
    });
    h += "</details>";

    var i = doc.indicators || {};
    var order = ["real10", "ig", "ust2", "ust5", "ust10", "ust30", "be10", "dxy", "usdkrw", "jpy", "n225"];
    h += '<details class="gm-d"><summary>지표 전체</summary><div class="gm-grid">';
    order.forEach(function (k) {
      var d = i[k];
      if (!d) return;
      var cls = d.chg_60d > 0 ? "gm-up" : (d.chg_60d < 0 ? "gm-dn" : "");
      h += '<div class="gm-i"><div class="l">' + esc(d.label) + "</div>";
      h += '<div class="v">' + num(d.value, d.unit) + "</div>";
      h += '<div class="d">60일 <span class="' + cls + '">' + sgn(d.chg_60d, d.is_pct ? "%" : "") + "</span>";
      if (d.pctile_5y != null) h += " · 5년 " + d.pctile_5y + "%";
      h += "</div></div>";
    });
    h += "</div></details>";

    h += '<details class="gm-d"><summary>분기 맥락 — 한국·미국·중국·중동</summary>';
    C.blocks.forEach(function (b) {
      h += '<div class="gm-ctx"><div class="r">' + esc(b.region) + "</div>";
      h += '<div class="w">비중 ' + esc(b.weight) + "</div><p>" + esc(b.text) + "</p>";
      h += '<p style="color:var(--dim,#5F6E80)">볼 것 · ' + esc(b.watch) + "</p></div>";
    });
    h += '<div class="gm-note">갱신 ' + esc(C.updated) + " · " + esc(C.note) + "</div></details>";
    return h;
  }

  /* ---------- 조립 ---------- */

  function build() {
    var j = judge();
    var h = '<div id="gm">';

    h += '<div class="gm-head"><div class="gm-head-t">' + esc(j.head) + "</div>";
    j.lines.forEach(function (l) {
      h += '<div class="gm-line' + (l.warn ? " warn" : l.watch ? " watch" : "") + '">' +
        "<b>" + esc(l.t) + "</b><span>" + esc(l.d) + "</span></div>";
    });
    h += "</div>";

    h += translate();
    h += calendar();
    h += details(M);

    if ((M.errors || []).length) {
      h += '<div class="gm-err">수집 실패: ' +
        M.errors.map(function (e) { return esc(e.src); }).join(" / ") + "</div>";
    }
    h += '<div class="gm-note">macro 수집 ' +
      esc(String(M.generated_at || "").slice(0, 16).replace("T", " ")) + "</div>";
    return h + "</div>";
  }

  function style() {
    if (document.getElementById("gm-style")) return;
    var css = [
      "#gm{margin:0 0 22px}",
      ".gm-h{font-size:13px;font-weight:700;color:var(--muted,#8B9AAE);margin:20px 0 8px}",
      ".gm-box{border-radius:12px;border:1px solid var(--line,#2C3849);",
      "background:var(--surface,#1B2330);padding:15px 16px}",
      ".gm-head{border-radius:12px;border:1px solid var(--open,#34C6A2);",
      "background:var(--surface,#1B2330);padding:16px;margin-bottom:4px}",
      ".gm-head-t{font-size:18px;font-weight:700;color:var(--text,#E6EBF2);line-height:1.4;margin-bottom:13px}",
      ".gm-line{border-left:2px solid var(--open,#34C6A2);padding:1px 0 1px 11px;margin-bottom:11px}",
      ".gm-line:last-child{margin-bottom:0}",
      ".gm-line.watch{border-left-color:var(--warn,#DFA33C)}",
      ".gm-line.warn{border-left-color:var(--up,#F0524F)}",
      ".gm-line b{display:block;font-size:14px;color:var(--text,#E6EBF2);margin-bottom:2px}",
      ".gm-line span{font-size:13px;line-height:1.6;color:var(--muted,#8B9AAE)}",
      ".gm-tr{padding:10px 0;border-bottom:1px solid var(--line,#2C3849)}",
      ".gm-tr:first-child{padding-top:0}",
      ".gm-tr:last-of-type{border-bottom:0}",
      ".gm-tr .l{font-size:12.5px;color:var(--muted,#8B9AAE)}",
      ".gm-tr .v{font-size:21px;font-weight:700;color:var(--text,#E6EBF2);line-height:1.25;margin:2px 0}",
      ".gm-tr .d{font-size:12.5px;color:var(--dim,#5F6E80);line-height:1.55}",
      ".gm-tr .d b{color:var(--text,#E6EBF2)}",
      ".gm-up{color:var(--up,#F0524F)}.gm-dn{color:var(--down,#4C8DF0)}",
      ".gm-ev{padding:11px 0;border-bottom:1px solid var(--line,#2C3849)}",
      ".gm-ev:first-child{padding-top:0}.gm-ev:last-of-type{border-bottom:0}",
      ".gm-ev .t{font-size:14px;font-weight:700;color:var(--text,#E6EBF2)}",
      ".gm-ev .dd{display:inline-block;min-width:44px;margin-right:9px;padding:2px 8px;",
      "border-radius:999px;font-size:11.5px;font-weight:700;text-align:center;",
      "background:var(--surface2,#222C3B);color:var(--muted,#8B9AAE)}",
      ".gm-ev .dd.near{background:rgba(52,198,162,.16);color:var(--open,#34C6A2)}",
      ".gm-ev .ap{font-size:11px;color:var(--dim,#5F6E80);font-weight:400}",
      ".gm-ev .w{font-size:12.5px;color:var(--muted,#8B9AAE);line-height:1.6;margin-top:5px;padding-left:53px}",
      ".gm-note{font-size:11.5px;color:var(--dim,#5F6E80);line-height:1.6;margin-top:11px}",
      ".gm-d{border-radius:12px;border:1px solid var(--line,#2C3849);",
      "background:var(--surface,#1B2330);padding:0 16px;margin-top:11px}",
      ".gm-d summary{padding:14px 0;font-size:13.5px;font-weight:700;",
      "color:var(--muted,#8B9AAE);cursor:pointer;list-style:none}",
      ".gm-d summary::-webkit-details-marker{display:none}",
      ".gm-d summary::after{content:' ▾';color:var(--dim,#5F6E80)}",
      ".gm-d[open] summary::after{content:' ▴'}",
      ".gm-d[open] summary{border-bottom:1px solid var(--line,#2C3849);margin-bottom:13px}",
      ".gm-d > *:last-child{margin-bottom:15px}",
      ".gm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:13px}",
      ".gm-i .l{font-size:11.5px;color:var(--dim,#5F6E80);margin-bottom:3px}",
      ".gm-i .v{font-size:18px;font-weight:700;color:var(--text,#E6EBF2);line-height:1.15}",
      ".gm-i .d{font-size:11.5px;color:var(--dim,#5F6E80);margin-top:3px}",
      ".gm-chain{margin-bottom:16px}",
      ".gm-chain h4{margin:0 0 3px;font-size:14.5px;font-weight:700;color:var(--text,#E6EBF2)}",
      ".gm-path{font-size:11.5px;color:var(--dim,#5F6E80);margin:0 0 8px;line-height:1.5}",
      ".gm-v{display:inline-block;font-size:11.5px;font-weight:700;padding:3px 10px;",
      "border-radius:999px;margin:0 0 8px}",
      ".gm-v.warn{background:rgba(240,82,79,.16);color:#F0524F}",
      ".gm-v.watch{background:rgba(223,163,60,.16);color:#DFA33C}",
      ".gm-v.ok{background:rgba(52,198,162,.15);color:#34C6A2}",
      ".gm-chain p{margin:0;font-size:13px;line-height:1.62;color:var(--muted,#8B9AAE)}",
      ".gm-plain{margin-top:9px;padding:11px 13px;border-radius:8px;",
      "background:var(--surface2,#222C3B);font-size:12.5px;line-height:1.65;color:var(--muted,#8B9AAE)}",
      ".gm-plain b{display:block;color:var(--text,#E6EBF2);font-size:12px;margin-bottom:4px}",
      ".gm-ctx{border-left:2px solid var(--line,#2C3849);padding:2px 0 2px 12px;margin-bottom:14px}",
      ".gm-ctx .r{font-size:13.5px;font-weight:700;color:var(--text,#E6EBF2)}",
      ".gm-ctx .w{font-size:11.5px;color:var(--dim,#5F6E80);margin:2px 0 6px}",
      ".gm-ctx p{margin:0 0 5px;font-size:13px;line-height:1.6;color:var(--muted,#8B9AAE)}",
      ".gm-err{font-size:11.5px;color:var(--warn,#DFA33C);margin-top:10px}",
      ".gw{border-radius:12px;border:1px solid var(--warn,#DFA33C);",
      "background:rgba(223,163,60,.06);padding:15px 16px;margin:0 0 18px}",
      ".gw-t{font-size:14px;font-weight:700;color:var(--warn,#DFA33C);margin-bottom:11px}",
      ".gw-r{padding:11px 0;border-top:1px solid var(--line,#2C3849)}",
      ".gw-r:first-of-type{border-top:0;padding-top:0}",
      ".gw-rule{font-size:13px;font-weight:700;color:var(--text,#E6EBF2);line-height:1.5}",
      ".gw-sym{font-size:11.5px;color:var(--dim,#5F6E80);margin:2px 0 7px}",
      ".gw-i{display:block;font-size:12.5px;line-height:1.55;color:var(--muted,#8B9AAE);",
      "text-decoration:none;margin-bottom:7px}",
      ".gw-i span{display:block;font-size:11px;color:var(--dim,#5F6E80);margin-top:1px}",
      ".gw-note{font-size:11.5px;color:var(--dim,#5F6E80);line-height:1.6;margin-top:10px}"
    ].join("");
    var el = document.createElement("style");
    el.id = "gm-style";
    el.textContent = css;
    document.head.appendChild(el);
  }

  function host() {
    var el = document.getElementById("macro");
    if (el) return el;
    var nodes = document.querySelectorAll("div,section");
    var best = null, len = Infinity;
    for (var n = 0; n < nodes.length; n++) {
      var t = nodes[n].textContent || "";
      if (t.indexOf("미국채 5년") === -1 || t.indexOf("미국채 30년") === -1) continue;
      if (t.length < len) { len = t.length; best = nodes[n]; }
    }
    return best;
  }

  function paintWatch() {
    if (!W || !(W.alerts || []).length) return;
    var el = document.getElementById("today");
    if (!el || el.querySelector("#gw")) return;
    style();

    var by = {};
    W.alerts.forEach(function (a) { (by[a.id] = by[a.id] || []).push(a); });

    var h = '<div id="gw" class="gw"><div class="gw-t">반증 조건 관련 뉴스</div>';
    Object.keys(by).forEach(function (k) {
      var g = by[k], r = g[0];
      h += '<div class="gw-r"><div class="gw-rule">' + esc(r.rule) + "</div>";
      h += '<div class="gw-sym">' + esc((r.syms || []).join(" · ")) + "</div>";
      g.forEach(function (a) {
        h += '<a class="gw-i" href="' + esc(a.url) + '" target="_blank" rel="noopener">' +
          esc(a.title) + '<span>' + esc(a.source) + " · " + esc(a.date) + "</span></a>";
      });
      h += "</div>";
    });
    h += '<div class="gw-note">걸린 날에만 뜹니다. 기사 자체가 판정은 아닙니다 — 논거 카드의 반증 조건에 실제로 해당하는지 직접 확인하세요.</div></div>';
    el.insertAdjacentHTML("afterbegin", h);
  }

  function paint() {
    paintWatch();
    if (!M) return;
    var el = host();
    if (!el || el.querySelector("#gm")) return;
    style();
    el.insertAdjacentHTML("afterbegin", build());
  }

  fetch("macro.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j) { M = j; paint(); } })
    .catch(function () {});

  var W = null;
  fetch("watch.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j) { W = j; paintWatch(); } })
    .catch(function () {});

  fetch("data.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j) return;
      D = j;
      var g = document.getElementById("gm");
      if (g) g.parentNode.removeChild(g);   // 계좌 번역 포함해 다시 그린다
      paint();
    })
    .catch(function () {});

  if (window.MutationObserver) {
    new MutationObserver(function () { paint(); })
      .observe(document.body, { childList: true, subtree: true });
  }
  setInterval(paint, 1000);
  document.addEventListener("click", function () { setTimeout(paint, 80); });
})();
