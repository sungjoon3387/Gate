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
  updated: "2026-09-18",
  note: "분기 1회 갱신. 판정에는 연결하지 않습니다 — 배경 이해용입니다.",

  // 지난 이벤트는 자동으로 숨겨집니다. approx:true 는 날짜 미확정.
  events: [
    { date: "2026-09-16", title: "FOMC 결정 · 점도표",
      watch: "결과 — 3.75~4.00%로 25bp 인상(2023년 7월 이후 첫 인상), 위원 12명 전원 찬성. 점도표는 18명 중 16명이 연내 최소 1회 추가 인상" },
    { date: "2026-09-18", title: "일본은행 금융정책결정회의",
      watch: "정책금리보다 일본 10년물이 3%에서 더 가는지, 그리고 엔화가 급등하는지. 급등이면 캐리 청산 국면" },
    { date: "2026-10-13", approx: true, title: "미국 9월 소비자물가",
      watch: "이란발 에너지 충격이 근원 물가로 번지는지. 번지면 12월 추가 인상이 굳어집니다" },
    { date: "2026-10-22", approx: true, title: "GE 버노바 3분기 실적",
      watch: "가스터빈 수주잔고 125GW 목표 진도. 시장 기대는 130~140GW라 목표 달성만으로는 실망 재료" },
    { date: "2026-10-28", approx: true, title: "Eaton 3분기 실적",
      watch: "미주 book-to-bill 1.2 유지 여부, Electrical Americas 마진 순차 개선" },
    { date: "2026-12-16", approx: true, title: "12월 FOMC",
      watch: "연내 추가 인상 여부. 점도표대로면 4.00~4.25%가 됩니다" }
  ],

  blocks: [
    { region: "중동", weight: "높음 — 직접 경로",
      text: "오일머니가 유가·인플레 경로가 아니라 AI 인프라 직접투자 경로로 들어옵니다. 국부펀드가 미국 데이터센터에 자본을 대면 그건 곧 ETN·GEV의 수주 파이프라인입니다. 유가보다 SWF 투자 발표를 봐야 합니다.",
      watch: "사우디 PIF·UAE 관련 미국 데이터센터 투자 발표, 브렌트유" },
    { region: "중국", weight: "낮음 — 인과가 길다",
      text: "미국채 보유 축소 → 장기금리 경로는 TIC 데이터가 2개월 지연되고 노이즈가 큽니다. 전력기기도 북미 시장은 사실상 차단돼 영향이 제한적입니다. 판정에는 쓰지 않습니다.",
      watch: "구리 가격, 위안화, TIC 보고서" },
    { region: "메모리 가격", weight: "중간 — 캐펙스 숫자의 착시",
      text: "메모리는 서버 비용의 최대 절반을 차지하고 지금 두 자릿수로 오르고 있습니다. 하이퍼스케일러 캐펙스 금액이 늘어도 실제로 지어지는 데이터센터 수는 덜 늘 수 있다는 뜻입니다. 7,200억 달러라는 숫자를 그대로 물량으로 환산하면 안 됩니다. 성준의 직장 매출이기도 해서 계좌와 소득이 같은 방향으로 움직입니다.",
      watch: "DRAM·낸드 고정거래가, 하이퍼스케일러 실적 콜의 메모리 비용 언급" },
    { region: "전기요금", weight: "중간 — 확장의 사회적 상한",
      text: "데이터센터 건설 지연의 큰 원인이 주민 반대이고, 그 이유가 전기요금 인상 우려입니다. 전력 수요가 몰리면 유틸리티가 송배전 투자를 늘리고 그 비용이 요금으로 전가됩니다. AI 캐펙스를 멈추는 게 금리가 아니라 정치일 수 있습니다.",
      watch: "미국 주별 전기요금 인상률, 데이터센터 인허가 부결 사례" },
    { region: "한국", weight: "중간 — 환율 수급",
      text: "원/달러를 실제로 움직이는 국내 변수는 금리차보다 수급입니다. 국민연금 해외투자와 환헤지 비율 조정, 서학개미 순매수, 경상수지가 축입니다.",
      watch: "국민연금 기금운용본부 공시(분기), 예탁결제원 세이브로 순매수, 반도체 수출 증가율 — 성준의 급여·성과급 선행지표이기도 함" }
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
    }).filter(function (r) { return r.dd >= -2; })
      .sort(function (a, b) { return a.dd - b.dd; })
      .slice(0, 5);
    if (!rows.length) return "";

    var h = '<div class="gm-h">다음 확인 일정</div><div class="gm-box">';
    rows.forEach(function (r) {
      var done = r.dd < 0;
      var tag = done ? "종료" : (r.dd === 0 ? "오늘" : "D-" + r.dd);
      h += '<div class="gm-ev' + (done ? " done" : "") + '"><div class="t"><span class="dd' +
        (done ? " past" : (r.dd <= 3 ? " near" : "")) + '">' +
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

  /* 판정별 해설 — 쉬운 설명 + 과거 사례.
     판정 문자열에 키가 포함되면 그 항목을 씁니다. 순서대로 먼저 걸리는 것이 우선. */
  var PLAIN = {
    policy: [
      ["인상 확정", {
        easy: "연준이 돈의 값을 올렸습니다. 은행이 연준에 맡길 때 받는 이자가 오르면 기업·개인이 빌릴 때 내는 이자도 따라 오릅니다. 미래에 벌 돈이 많은 회사일수록 지금 가치가 크게 깎입니다. 30년 뒤 받을 약속이 이자율에 더 민감한 것과 같은 이치입니다.",
        hist: [
          { y: "2022", t: "제로금리에서 4.5%까지 — 사상 최속 인상",
            d: "연준이 1년도 안 되어 0%에서 4.25~4.50%로 올렸습니다. 나스닥100은 그 해 약 33% 빠졌는데 기업 이익이 줄어서가 아니라 할인율이 바뀌어서였습니다. 실적은 멀쩡한데 주가만 반토막 나는 경험이 이때 나왔습니다.",
            k: "인상 시작 시점 10년물 1.5% → 연말 3.9% · 나스닥100 -33%" },
          { y: "2015~2018", t: "천천히 올린 경우는 달랐다",
            d: "2015년 12월 첫 인상 후 3년에 걸쳐 2.25~2.50%까지 아홉 차례 올렸습니다. 2016~2017년에는 주식이 올랐고 마지막 해인 2018년에만 빠졌습니다. 인상 자체보다 속도와 사이클 후반부 여부가 시장을 결정합니다.",
            k: "3년간 9회 인상 · 2016 +9.5%, 2017 +19.4%, 2018 -6.2%" }
        ]
      }],
      ["인하 확정", {
        easy: "돈의 값이 내려갔습니다. 먼 미래의 이익이 다시 비싸게 평가되므로 성장주에 유리합니다. 다만 '왜 내렸는가'가 더 중요합니다 — 물가가 잡혀서 내리면 호재, 경기가 꺾여서 내리면 악재입니다.",
        hist: [
          { y: "2019", t: "보험성 인하 — 주가 상승",
            d: "경기 침체가 아닌 상태에서 예방적으로 세 차례 내렸습니다. 그 해 S&P500은 크게 올랐습니다.",
            k: "2.5% → 1.75% · 침체 없음" },
          { y: "2007~2008", t: "위기 대응 인하 — 주가 폭락",
            d: "같은 인하인데 금융위기 대응이었습니다. 금리를 5.25%에서 0까지 내리는 동안 주가는 계속 빠졌습니다.",
            k: "5.25% → 0% · S&P500 고점 대비 -57%" }
        ]
      }],
      ["인상 사이클", {
        easy: "이번 회의에서는 안 올렸지만 방향은 여전히 위입니다. 사이클 중간의 숨고르기 구간이고, 다음 회의까지의 경로가 값을 움직입니다.",
        hist: [
          { y: "2004~2006", t: "17회 연속 인상 — 그린스펀의 수수께끼",
            d: "연준이 1%에서 5.25%까지 꾸준히 올렸는데 장기금리는 꿈쩍하지 않았습니다. 그린스펀이 '수수께끼'라 불렀고, 결과적으로 그 낮은 장기금리가 주택 거품을 키워 2008년으로 이어졌습니다.",
            k: "정책금리 +4.25%p 동안 10년물 거의 제자리" }
        ]
      }],
      ["동결", {
        easy: "정책은 멈춰 있습니다. 지금 움직이는 건 연준이 아니라 시장 금리입니다. 이럴 때는 정책 기대가 아니라 재정·수급 같은 다른 요인이 금리를 움직입니다.",
        hist: [
          { y: "2023 하반기", t: "동결 중에 장기금리가 혼자 올랐다",
            d: "연준은 가만히 있었는데 10년물이 5%를 넘었습니다. 재정적자와 국채 발행 증가가 원인이었고, 주가는 3개월간 약 10% 조정받았습니다. 정책이 멈춰도 금리는 오를 수 있다는 사례입니다.",
            k: "정책금리 동결 · 10년물 4.0% → 5.02%" }
        ]
      }]
    ],

    curve: [
      ["플래트닝", {
        easy: "돈을 빌리는 기간마다 이자가 다릅니다. 지금은 2~5년짜리 이자가 30년짜리보다 빠르게 오르고 있습니다. 30년이 앞장섰다면 '나라 빚이 걱정된다'는 뜻이라 훨씬 나쁜 신호인데, 짧은 쪽이 앞장선 건 '연준이 곧 금리를 올릴 것 같다'는 뜻입니다. 시장이 긴축을 믿고 있고, 그 긴축이 장기 물가는 잡을 거라 보고 있다는 의미이기도 합니다.",
        hist: [
          { y: "1994", t: "채권 대학살 — 지금과 가장 닮은 해",
            d: "물가가 2%대로 안정적이었는데 연준이 선제적으로 올렸습니다. 1년 만에 3%에서 6%까지, 11월에는 한 번에 0.75%p를 올렸습니다. 짧은 쪽이 훨씬 빨리 뛰면서 2년-10년 격차가 190bp에서 30bp 수준까지 좁혀졌습니다. 전 세계 채권 손실이 약 1조 5천억 달러였고 오렌지카운티가 파산했습니다. 그런데 주식은 제자리였고 이듬해 S&P500이 37% 올랐습니다. 다친 건 방향을 틀린 사람이 아니라 레버리지를 쓴 사람이었습니다.",
            k: "2년물 3.9% → 7.7% · 10년물 5.8% → 7.8% · S&P500 1994년 보합, 1995년 +37%" },
          { y: "2022", t: "플래트닝이 역전까지 갔던 해",
            d: "짧은 쪽이 계속 빨리 오르다 7월에 2년물이 10년물을 넘어섰습니다. 역사적으로 이 역전은 1~2년 뒤 침체를 예고해 왔는데, 이번엔 침체가 오지 않아 '이번엔 달랐다'는 사례로도 남았습니다.",
            k: "연말 2년물 4.4% vs 10년물 3.9% (역전) · 나스닥100 -33%" },
          { y: "2004~2006", t: "플래트닝이 위기의 전조였던 경우",
            d: "연준이 17회 올려 1%에서 5.25%로 갔는데 장기금리가 따라 오르지 않아 커브가 평평해지다 역전됐습니다. 그린스펀이 '수수께끼'라 불렀고, 그 낮은 장기금리가 주택 거품을 키워 2년 뒤 금융위기로 이어졌습니다.",
            k: "정책금리 +4.25%p 동안 10년물 거의 제자리 · 2006년 역전 → 2008년 위기" }
        ]
      }],
      ["스티프닝", {
        easy: "긴 쪽 이자가 더 빨리 오르고 있습니다. 이건 '연준이 올릴 것 같다'가 아니라 '이 나라에 30년을 빌려주기가 불안하다'는 뜻입니다. 재정적자, 국채 발행 증가, 물가를 못 잡을 거라는 의심이 여기에 실립니다. 플래트닝보다 훨씬 나쁜 신호이고 주식 밸류에이션 압박이 더 오래갑니다.",
        hist: [
          { y: "2023년 8~10월", t: "신용등급 강등과 10년물 5% 돌파",
            d: "피치가 미국 신용등급을 AA+로 강등한 뒤 장기물이 앞장서 올랐습니다. 10년물이 2007년 이후 처음 5%를 넘었고 주가는 3개월간 약 10% 조정받았습니다. 그동안 연준은 아무것도 하지 않았습니다 — 정책이 멈춰도 재정 불안만으로 금리가 오를 수 있다는 사례입니다.",
            k: "10년물 4.0% → 5.02% · 30년물이 상승 주도 · S&P500 -10%" },
          { y: "2024년 9월~2025년 1월", t: "연준이 내렸는데 장기금리가 올랐다",
            d: "연준은 9·11·12월 세 차례, 연간 100bp를 인하했습니다. 그런데 10년물은 오히려 올랐습니다. 12월 FOMC에서 2025년 인하 횟수를 4회에서 2회로 줄이고 물가 전망을 올리자 금리와 달러가 함께 급등했습니다. 인하가 곧 장기금리 하락은 아니라는 교훈입니다.",
            k: "정책금리 -100bp · 10년물 3.6% → 4.8%" },
          { y: "2013", t: "테이퍼 텐트럼",
            d: "연준 의장이 자산매입 축소를 시사하자 장기물이 앞장서 뛰었습니다. 넉 달 만에 10년물이 1.6%에서 3.0%로 올랐고 신흥국에서 자금이 대량으로 빠졌습니다. 정작 실제 축소는 그해 12월에야 시작됐습니다. 짧은 쪽은 연준 가이던스에 묶여 있어 커브가 가팔라졌습니다.",
            k: "10년물 1.6% → 3.0% · 2년물은 거의 제자리 · 신흥국 자금 유출" }
        ]
      }],
      ["평행", {
        easy: "커브 전 구간이 비슷하게 움직였습니다. 특정 구간의 이야기가 아니라 금리 수준 자체의 재평가입니다. 정책 기대나 재정 불안 중 하나로 설명되지 않는, 더 근본적인 이동이라 드물게 나타납니다.",
        hist: [
          { y: "2016년 11~12월", t: "선거 결과가 커브 전체를 밀어올렸다",
            d: "미 대선 직후 감세와 재정지출 기대가 커지면서 두 달 만에 커브 전 구간이 함께 올랐습니다. 성장과 물가 기대가 동시에 바뀌면 이런 모양이 나옵니다. 주식도 같이 올랐다는 점에서 금리 상승이 항상 악재는 아니라는 사례입니다.",
            k: "2년물 0.8% → 1.2% · 10년물 1.8% → 2.45% · S&P500 동반 상승" }
        ]
      }]
    ],

    capex: [
      ["경고", {
        easy: "데이터센터는 현금이 아니라 빌린 돈으로 짓습니다. 그래서 중요한 건 국채금리가 아니라 '기업이 빌릴 때 얹어내는 웃돈'입니다. 그 웃돈이 벌어지기 시작했다는 건 돈줄이 마르고 있다는 뜻이고, 이때 발주가 멈춥니다. 전력기기 3종목이 동시에 흔들리는 유일한 경로입니다.",
        hist: [
          { y: "2008", t: "웃돈이 6%를 넘었을 때",
            d: "투자등급 회사채 스프레드가 600bp를 넘었습니다. 우량 기업조차 돈을 못 빌렸고 모든 설비투자가 멈췄습니다. 산업재 주식이 가장 크게 무너진 구간입니다.",
            k: "IG 스프레드 600bp+ · S&P500 -57%" },
          { y: "2020년 3월", t: "2주 만에 벌어진 웃돈",
            d: "코로나 충격으로 스프레드가 373bp까지 순식간에 벌어졌습니다. 연준이 회사채를 직접 사겠다고 발표하자 몇 주 만에 되돌아왔습니다. 정책이 개입하면 빠르게 정상화된다는 사례입니다.",
            k: "IG 스프레드 100bp → 373bp → 2개월 만에 정상화" }
        ]
      }],
      ["관찰", {
        easy: "기업이 빌릴 때 내는 웃돈이 조금씩 벌어지고 있습니다. 아직 경고는 아니지만 방향이 나쁩니다. 국채금리 상승과 같이 움직이는지, 아니면 신용 쪽 고유 문제인지를 구분해서 봐야 합니다.",
        hist: [
          { y: "2018년 4분기", t: "웃돈이 벌어지자 주가가 먼저 반응했다",
            d: "연준이 계속 올리는 가운데 스프레드가 100bp에서 160bp로 벌어졌습니다. S&P500은 그 분기에 약 14%, 9월 고점 대비로는 19.8% 빠졌습니다. 연준이 이듬해 인상을 멈추자 스프레드와 주가가 함께 회복했습니다.",
            k: "IG 스프레드 약 106 → 153bp · S&P500 4분기 -14%, 고점 대비 -19.8%" }
        ]
      }],
      ["안정", {
        easy: "국채금리는 올랐는데 기업이 빌릴 때 내는 웃돈은 그대로입니다. 돈값은 비싸졌지만 빌리는 난이도는 안 올라갔다는 뜻이고, 그래서 공사는 계속됩니다. 금리가 캐펙스를 죽이는 게 아니라 웃돈이 죽입니다.",
        hist: [
          { y: "2017", t: "인상 중에도 웃돈이 사상 최저였던 해",
            d: "연준이 세 차례 올렸는데 스프레드는 오히려 좁아져 100bp 아래로 내려갔습니다. 설비투자가 늘었고 주가도 올랐습니다. 금리 인상과 기업 활황이 공존할 수 있다는 사례입니다.",
            k: "IG 스프레드 90bp대 · S&P500 +19%" },
          { y: "2024~2025", t: "고금리에도 조용했던 신용시장",
            d: "정책금리가 5%대에 머무는 동안에도 스프레드는 역사적 하단에 있었습니다. AI 투자가 이 구간에 집중적으로 집행됐습니다.",
            k: "정책금리 5%대 · IG 스프레드 80~100bp" }
        ]
      }]
    ],

    oil: [
      ["경고", {
        easy: "기름값은 거의 모든 물건값에 들어갑니다. 운송비, 플라스틱, 비료까지요. 그래서 유가가 오르면 몇 달 뒤 물가 전반이 오르고, 중앙은행은 금리를 더 올려야 합니다. 동시에 전력기기 회사는 구리와 물류비가 올라 원가가 뜁니다. 그런데 계약은 몇 년 전 가격으로 묶여 있어 그 차이를 회사가 떠안습니다.",
        hist: [
          { y: "2008", t: "147달러에서 35달러로 — 급등의 끝은 급락이었다",
            d: "7월에 배럴당 147달러로 사상 최고를 찍었습니다. 그 직후 수요가 무너지며 연말에 35달러까지 빠졌습니다. 유가 급등이 물가를 밀어올려 중앙은행이 긴축하는 사이 경기가 먼저 꺾인 겁니다. 유가가 가장 비쌀 때가 경기 정점이었습니다.",
            k: "WTI 147 → 35달러 · 같은 해 S&P500 -37%" },
          { y: "1973~74", t: "오일쇼크 — 물가와 침체가 동시에",
            d: "유가가 네 배로 뛰자 물가가 두 자릿수로 올랐고 경기는 침체에 빠졌습니다. 중앙은행이 물가와 성장 중 하나를 포기해야 하는 상황이었고, 주식은 2년간 반토막 났습니다.",
            k: "미 물가 12%대 · S&P500 1973~74 약 -48%" }
        ]
      }],
      ["관찰", {
        easy: "기름값이 높은 구간이지만 아직 다른 물가로 번지지는 않았습니다. 헤드라인 물가에는 바로 반영되고, 식품·에너지를 뺀 근원 물가로 번지려면 몇 달이 걸립니다. 근원까지 가면 중앙은행이 움직입니다.",
        hist: [
          { y: "2022", t: "번졌던 경우",
            d: "러시아의 우크라이나 침공으로 유가가 130달러를 넘었고, 근원 물가까지 번지자 연준이 사상 최속으로 올렸습니다. 유가는 그 해 후반 안정됐지만 금리는 이미 올라간 뒤였습니다.",
            k: "WTI 130달러 · 근원 물가 6%대 · 정책금리 0 → 4.5%" },
          { y: "2018", t: "안 번졌던 경우",
            d: "유가가 76달러까지 올랐지만 근원 물가는 2%대에 머물렀습니다. 연준은 예정대로 올렸고 유가는 그 해 말 42달러로 내려갔습니다. 높은 유가가 항상 물가로 번지지는 않습니다.",
            k: "WTI 76 → 42달러 · 근원 물가 2%대 유지" }
        ]
      }],
      ["중립", {
        easy: "기름값이 물가를 밀어올릴 수준이 아닙니다. 전력기기 원가에도 부담이 적고, 연준 경로에도 영향이 제한적입니다.",
        hist: []
      }]
    ],

    japan: [
      ["청산 진행", {
        easy: "일본은 30년간 이자가 거의 0이었습니다. 그래서 전 세계 투자자가 엔을 싸게 빌려 다른 나라 자산을 샀습니다. 이걸 엔 캐리라고 합니다. 일본 금리가 오르면 빌린 돈을 갚아야 하고, 갚으려면 사뒀던 자산을 팔아야 합니다. 그게 전 세계에서 동시에 일어나는 게 청산입니다. 이때 하락은 실적이 나빠서가 아니라 돈이 급하게 빠져나가서 생기므로 회복도 가장 빠릅니다.",
        hist: [
          { y: "2024년 8월 5일", t: "하루 만에 닛케이 12% 급락",
            d: "일본은행이 금리를 0.25%로 올리자 캐리 청산이 터졌습니다. 닛케이는 하루 4,451포인트 빠져 1987년 블랙먼데이를 넘는 사상 최대 하락폭을 기록했고, 코스피도 8.77% 빠지며 서킷브레이커가 발동했습니다. 엔화는 161엔에서 141엔까지 급등했습니다. 그런데 나스닥은 3주 만에 회복했습니다.",
            k: "닛케이 -12.4% · 코스피 -8.77% · VIX 장중 65 · 3주 만에 회복" },
          { y: "1998년 10월", t: "이틀간 엔화 15% 급등",
            d: "LTCM 사태로 헤지펀드들이 한꺼번에 엔 차입을 갚으면서 엔화가 이틀 만에 15% 뛰었습니다. 캐리 청산이 얼마나 빠르게 일어나는지 보여준 첫 사례입니다.",
            k: "엔/달러 136 → 115 · 이틀간 15%" }
        ]
      }],
      ["엔 강세", {
        easy: "엔화가 강해지고 있지만 일본 주식은 버티고 있습니다. 청산이라면 둘이 같이 움직입니다. 지금은 금리차 축소나 안전자산 선호 같은 다른 이유일 가능성이 큽니다. 닛케이가 따라 빠지는지가 갈림길입니다.",
        hist: [
          { y: "2016", t: "엔 강세가 청산이 아니었던 해",
            d: "일본은행이 마이너스 금리를 도입했는데도 엔화가 한 해 동안 크게 강해졌습니다. 캐리 청산이 아니라 전 세계 안전자산 선호 때문이었고, 미국 주식은 그 해 올랐습니다.",
            k: "엔/달러 121 → 100 (8월 저점), 연말 117 · S&P500 +9.5%" }
        ]
      }],
      ["캐리 유인", {
        easy: "엔을 빌려 달러 자산을 사는 이득이 줄어들고 있습니다. 아직 엔화는 조용하지만 재료가 쌓이는 중입니다. 금리차가 좁아진 상태에서 작은 충격이 오면 청산이 한꺼번에 터집니다.",
        hist: [
          { y: "2024년 7월", t: "터지기 직전의 한 달",
            d: "미일 금리차가 좁아지는 가운데 엔화가 조용히 강해지고 있었습니다. 대부분이 대수롭지 않게 봤고, 그 다음 달에 사상 최대 급락이 나왔습니다.",
            k: "7월 엔화 조용한 절상 → 8월 5일 청산" }
        ]
      }],
      ["안정", {
        easy: "엔화가 급격히 움직이지 않고 있습니다. 일본은행이 올려도 미일 금리차가 충분히 크면 캐리는 유지됩니다. 실제로 우려만큼 청산이 일어나지 않은 경우가 더 많았습니다.",
        hist: [
          { y: "2025~2026", t: "두 번의 인상, 두 번 다 조용했다",
            d: "일본은행이 0.75%, 이어 1.0%로 올렸지만 우려하던 대규모 청산은 나타나지 않았습니다. 미국과의 금리차가 여전히 커서 캐리가 유지됐기 때문입니다. 공포가 반복된다고 매번 현실이 되지는 않습니다.",
            k: "정책금리 0.5% → 1.0% · 시장 반응 제한적" }
        ]
      }]
    ],

    fx: [
      ["원화 강세", {
        easy: "해외주식은 달러로 사서 원화로 평가됩니다. 주가가 그대로여도 원화가 강해지면 계좌 숫자는 줄어듭니다. 반대로 지금 새로 사는 달러는 싸게 사는 셈입니다. 이미 들고 있는 자산에는 역풍, 새로 사는 데는 순풍입니다.",
        hist: [
          { y: "2023 상반기", t: "원화 강세 구간의 착시",
            d: "미국 주식이 오르는데도 원화 환산 수익률은 지지부진했습니다. 많은 투자자가 '내 종목만 안 오른다'고 느꼈지만 실제 원인은 환율이었습니다.",
            k: "원/달러 1,320원 → 1,260원 · 달러 기준 수익의 상당분 상쇄" }
        ]
      }],
      ["원화 약세", {
        easy: "금리차가 환율에 그대로 반영되는 국면입니다. 보유 해외자산의 원화 평가액이 주가와 무관하게 올라갑니다. 대신 새로 달러를 사는 단가는 나빠집니다.",
        hist: [
          { y: "2022", t: "주가는 빠졌는데 계좌는 덜 아팠다",
            d: "나스닥이 33% 빠지는 동안 원/달러가 1,190원에서 1,440원대까지 올랐습니다. 원화로 환산하면 손실이 절반 가까이 상쇄됐습니다. 해외자산이 위기 때 완충 역할을 한 사례입니다.",
            k: "원/달러 1,190 → 1,439 (10월 고점, +21%), 연말 1,264 · 나스닥100 -33%" }
        ]
      }],
      ["중립", {
        easy: "환율이 좁은 범위에 있습니다. 통화 선택이 수익률을 좌우하는 국면은 아니고, 종목 자체의 논거로 판단하면 됩니다.",
        hist: []
      }]
    ]
  };

  function plainFor(c) {
    var list = PLAIN[c.id];
    if (!list) return "";
    var v = c.verdict || "";
    var found = null;
    for (var i = 0; i < list.length; i++) {
      if (v.indexOf(list[i][0]) !== -1) { found = list[i][1]; break; }
    }
    if (!found) found = list[list.length - 1][1];

    var h = '<div class="gm-plain"><b>쉽게 말하면</b>' + esc(found.easy) + "</div>";
    (found.hist || []).forEach(function (x) {
      h += '<div class="gm-hist"><div class="gm-hy">' + esc(x.y) + "</div>";
      h += '<div class="gm-ht">' + esc(x.t) + "</div>";
      h += "<p>" + esc(x.d) + "</p>";
      if (x.k) h += '<div class="gm-hk">' + esc(x.k) + "</div>";
      h += "</div>";
    });
    return h;
  }

  function details(doc) {
    var h = "";
    h += '<details class="gm-d"><summary>인과 사슬 — 왜 그런 판정인가</summary>';
    (doc.chains || []).forEach(function (c) {
      h += '<div class="gm-chain"><h4>' + esc(c.title) + "</h4>";
      h += '<div class="gm-path">' + esc(c.path) + "</div>";
      if (c.verdict) h += '<span class="gm-v ' + vclass(c.verdict) + '">' + esc(c.verdict) + "</span>";
      h += "<p>" + esc(c.text) + "</p>";
      h += plainFor(c);
      h += "</div>";
    });
    h += "</details>";

    var i = doc.indicators || {};
    var order = ["ffr", "real10", "ig", "hy", "wti", "copper", "ust2", "ust5", "ust10", "ust30", "be10", "dxy", "usdkrw", "jpy", "n225"];
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
      ".gm-ev .dd.past{background:transparent;border:1px solid var(--line,#2C3849);color:var(--dim,#5F6E80)}",
      ".gm-ev.done .t{color:var(--dim,#5F6E80)}",
      ".gm-ev.done .w{opacity:.6}",
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
      ".gm-hist{margin-top:9px;padding:11px 13px;border-radius:8px;",
      "border:1px solid var(--line,#2C3849)}",
      ".gm-hy{font-size:11px;font-weight:700;color:var(--warn,#DFA33C);letter-spacing:.03em}",
      ".gm-ht{font-size:13px;font-weight:700;color:var(--text,#E6EBF2);margin:2px 0 5px}",
      ".gm-hist p{margin:0;font-size:12.5px;line-height:1.65;color:var(--muted,#8B9AAE)}",
      ".gm-hk{margin-top:7px;padding-top:7px;border-top:1px solid var(--line,#2C3849);",
      "font-size:11.5px;color:var(--dim,#5F6E80);line-height:1.5}",
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
