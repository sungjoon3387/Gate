/* ============================================================
   Gate — 논거 카드 (데이터 + 렌더러 통합, 단일 파일)

   설치: index.html 의 </body> 바로 앞에 아래 한 줄만 추가
         <script src="thesis.js"></script>

   index.html 의 다른 부분은 손대지 않습니다.
   이 스크립트가 화면에서 종목 카드를 직접 찾아 논거를 덧붙입니다.

   갱신 규칙
     claim     : 한 줄. 왜 들고 있는가
     evidence  : 숫자 + 날짜. 형용사 금지
     falsifier : 사실로 드러나면 내가 틀린 것. 측정 가능해야 함
     kpi       : 분기 1회 손으로 갱신하는 숫자 하나. 추세가 논지
     updated   : 90일 경과 시 카드에 빨간 배지
   ============================================================ */

window.THESIS = {
  updated: "2026-09-10",

  common: {
    title: "이 포트폴리오는 4종목이 아니라 1개의 베팅입니다",
    body: "ETN·GEV·HD현대일렉 3종목이 '북미 AI 데이터센터 전력 캐펙스'라는 단일 변수에 걸려 있고, QQQ도 상당 부분 같은 변수에 노출됩니다. HD현대일렉의 회전기기 수요 근거는 가스터빈 공급 부족인데, 그 병목이 곧 GEV입니다 — 두 종목은 헤지가 아니라 중복입니다.",
    watch: "공통 반증 경로: 미 장기금리 상승 → 회사채 조달금리·자본비용 상승 → AI 인프라 투자수익성 저하 → 캐펙스 둔화. 이 경로가 열리면 4종목이 같은 방향으로 동시에 움직입니다.",
    status: "2026-09-07 기준 미 10년물 4.78% (2025년 1월 이후 최고) · 9월 FOMC 25bp 인상 확률 62%"
  },

  cards: {
    "QQQ": {
      match: ["QQQ"],
      bucket: "코어",
      claim: "코어. 3년이 아니라 30년 자산이므로 전망으로 사고팔지 않는다. 매도 로직에서 영구 제외.",
      evidence: [
        "현재 약세는 실적이 아니라 금리 국면 — 8월 비농업 고용 16.2만명(예상 5.6만명의 약 3배), 9월 FOMC 25bp '인상' 확률 62%까지 상승 (2026-09-07)",
        "미 10년물 4.78%, 2년물 4.37% — 10년물은 2025년 1월 이후 최고",
        "7월 FOMC에서 이미 3명이 인상 소수의견. 인하가 아니라 인상 사이클 재개가 논의되는 국면",
        "기준금리 3.50~3.75%로 다섯 차례 연속 동결 상태"
      ],
      falsifier: [
        "해당 없음 — 코어는 반증 조건으로 청산하지 않는다",
        "다만 해석의 검증은 필요: 지수 하락과 함께 빅테크 실적·캐펙스 가이던스가 같이 꺾이면 '금리 때문'이라는 설명이 틀린 것"
      ],
      risk: "장기금리 상승은 할인율만의 문제가 아니다. 조달비용 경로가 열리면 QQQ와 전력기기 3종목이 함께 움직인다.",
      kpis: [
        { k: "수준", label: "하이퍼스케일러 4사 합산 캐펙스 가이던스", value: "$7,200~7,450억", asof: "2026-08" },
        { k: "가속도", label: "데이터센터 캐펙스 성장률", value: "50%+", prev: "1조 달러 도달 전망 2029년 → 2026년", dir: "up", asof: "델오로, 2026" },
        { k: "질량", label: "미국 내 건설 중인 데이터센터", value: "32GW", prev: "2030년까지 파이프라인 165~228GW", asof: "2026" },
        { k: "참고", label: "미 10년물 금리", value: "5.00%", prev: "4.78%", dir: "up", asof: "2026-09-16" }
      ],
      next: "9월 FOMC · 미 CPI",
      sources: "KB 환율 동향 및 전망 2026-09-07 / TradingEconomics",
      updated: "2026-09-10"
    },

    "ETN": {
      match: ["이튼", "Eaton", "ETN"],
      bucket: "위성",
      claim: "데이터센터 내부 배전·UPS. 세 종목 중 수요처에 가장 가깝고, 수주가 이미 실적으로 넘어오고 있다.",
      evidence: [
        "Q2'26 가이던스 재상향 — 유기성장 중간값 12%(+200bp), 조정 EPS 중간값 $13.50 (2026-07)",
        "전사 book-to-bill 1.2, 미주 1.3 — 수주가 매출을 계속 앞선다 (Q2'26)",
        "Q1'26 데이터센터 수주 +240% YoY, Electrical Americas 수주 +60%, 전기부문 수주잔고 +48% YoY",
        "미국 데이터센터 32GW 건설 중(약 70%가 AI), 2030년까지 계획 파이프라인 165~228GW",
        "Boyd Thermal 편입으로 냉각까지 확장, 2026년 매출 목표 $18억으로 상향"
      ],
      falsifier: [
        "Electrical Americas 마진이 분기 순차 +150bp 개선 가이드에 실패하고 두 분기 연속 하단",
        "book-to-bill 1.0 하회 — 수주 사이클 꺾임의 첫 신호",
        "2026년 말 30% 마진 진입 / 2030년 32% 목표에서 후퇴 발언",
        "[정치] 미국이 무역 중단이나 추가 관세를 실제 발효해 데이터센터 건설 비용이 오르고, 실적 콜에서 발주 지연이 언급됨",
        "[정치] 연준 독립성 훼손이 장기금리 상승으로 전이되어 커브가 베어 스티프닝으로 전환 — Gate 커브 판정이 자동으로 잡습니다"
      ],
      risk: "밸류에이션이 이미 비싼 데다 Q1'26에 인수 $110억 집행 + 자사주 매입 중단으로 부채가 늘어난 상태. 하반기 EBITDA가 밀리면 재무 레버리지가 그대로 노출된다.",
      kpis: [
        { k: "수준", label: "Electrical Americas book-to-bill", value: "1.2", prev: "1.2", asof: "2026 Q2" },
        { k: "가속도", label: "미주 수주 증가율 (12개월 이동)", value: "+33%", prev: "+42%", dir: "down", asof: "2026 Q2 — 9%p 감속" },
        { k: "질량", label: "수주잔고 커버리지", value: "약 2분기", prev: "수주잔고 $14.5B / 분기 매출 $7.5B", asof: "2026 Q2" },
        { k: "참고", label: "부문 영업이익률", value: "25.6%", prev: "30.0%", dir: "down", asof: "2026 Q1 — 증설 투자로 440bp 하락" }
      ],
      next: "Q3'26 실적 (10월 하순 예상)",
      sources: "Eaton Q2'26 earnings call 2026-07 / Q1'26 8-K",
      updated: "2026-09-10"
    },

    "GEV": {
      match: ["GE 버노바", "GE버노바", "GEV"],
      bucket: "위성",
      claim: "AI 전력 수요의 최상류(발전). 공급이 수요를 못 따라가는 구간이라 가격이 먼저 오른다.",
      evidence: [
        "Q2'26 총 수주잔고 $1,760억 — 2031년까지 물량 가시성 확보",
        "가스터빈 수주잔고+슬롯예약 100GW → 116GW (한 분기 +16GW), 연말 목표 125GW로 상향",
        "Power 부문 수주 +134%, book-to-bill 3.05x — 만드는 속도의 3배로 팔고 있다",
        "1H'26 신규 장비 수주 단가가 Q4'25 대비 약 20% 높음 — 가격 결정권 확인",
        "데이터센터향 전동화 수주 YTD $50억 초과",
        "생산능력 20GW(26년 3Q) → 24GW(2028) → 30GW(2030) 확장 진행"
      ],
      falsifier: [
        "연말 실제 가스 수주잔고가 125GW 미달 — 단, 시장 기대치는 130~140GW라 가이던스 충족만으로도 실망 재료",
        "30GW 증설 계획의 지연·축소 발표",
        "2031년 물량 판매 진척이 '연말까지 절반 이상' 목표에 미달",
        "풍력 적자가 3Q'26 브레이크이븐 가이드를 재차 이탈",
        "[정치] 미국 에너지 정책 변화로 가스 발전 신규 허가·발주가 밀림",
        "[정치] 무역 중단·관세로 데이터센터 캐펙스 자체가 둔화"
      ],
      risk: "이익의 질이 아직 나쁘다. Q2'26 EPS가 컨센서스를 $0.71 하회했고 풍력은 EBITDA -$2.75억(마진 -13.6%), 수주 -40%. '수주잔고는 훌륭한데 손익은 미스'가 반복되는 패턴.",
      kpis: [
        { k: "수준", label: "가스터빈 수주잔고+슬롯예약", value: "116GW", prev: "100GW", dir: "up", asof: "2026 Q2" },
        { k: "가속도", label: "분기 증가폭", value: "+16GW", prev: "다음 분기 +10GW 아래면 둔화 진입", dir: "up", asof: "2026 Q2" },
        { k: "질량", label: "수주잔고 커버리지", value: "약 19분기", prev: "총 수주잔고 $1,760억 (장기 서비스 계약 포함 — 장비만 보면 더 짧음)", asof: "2026 Q2" },
        { k: "참고", label: "Power 부문 book-to-bill", value: "3.05배", prev: "만드는 속도의 3배로 판매", asof: "2026 Q2" }
      ],
      next: "Q3'26 실적 (10월 하순 예상) — 20GW 연산 도달 여부",
      sources: "GE Vernova Q2'26 보도자료 2026-07-22 / Utility Dive 2026-07-23",
      updated: "2026-09-10"
    },

    "267260.KS": {
      match: ["HD현대일렉트릭", "HD현대일렉", "267260"],
      bucket: "위성",
      claim: "북미 초고압 변압기 병목의 직접 수혜. 회사 스스로 3년 만에 수주 목표를 올렸다.",
      evidence: [
        "2026 수주 목표 42.22억 → 51.85억 달러로 상향(+22.8%). 목표 상향은 2023년 이후 처음 (2026-07-06 정정공시)",
        "글로벌 빅테크와 최대 1조 1,212억원 규모 배전·전력기기 장기공급 기본계약, 2028년까지 순차 납품 (2026-07-02)",
        "765kV 초고압 변압기 수요 증가 + 북미 2공장 2027년 4월 준공 예정 → 준공 전 선제 수주 진행",
        "가스터빈 공급 부족으로 데이터센터용 육상발전기(회전기기) 수요가 추가 유입"
      ],
      falsifier: [
        "분기 수주액이 상향된 연간 목표 진도율에 미달",
        "'수익성 중심 선별 수주' 기조가 깨지고 저마진 수주로 외형만 증가",
        "북미 2공장 준공 일정 지연",
        "미국 관세·현지생산 요건 변화로 국내 생산분 가격 경쟁력 훼손"
      ],
      risk: "네 번째 근거가 곧 GEV의 공급 부족이다. 병목이 풀리면 이쪽이 먼저 식는다. 두 종목 동시 보유는 이 부분에서 헤지가 아니라 중복. 또한 52주 고점 대비 낙폭이 큰 구간이라, 논거와 주가가 반대로 움직이고 있는지 3분기 수주 진도율로 확인해야 한다.",
      kpi: { label: "연간 수주 목표", value: "51.85억$", prev: "42.22억$", dir: "up", asof: "2026-07" },
      next: "3분기 실적 (10월 말 예상)",
      sources: "정정공시 2026-07-06 / 한국경제·굿모닝경제 2026-07-06",
      updated: "2026-09-10"
    },

    "JEPQ": {
      match: ["JEPQ"],
      bucket: "정리 대상",
      claim: "손익분기 대비 +3% 도달 시 전량 매도. 매도 대금은 그 시점 QQQ와 전력기기 비율에 맞춰 재배분한다.",
      evidence: [
        "나스닥100에 콜을 매도하는 구조 — QQQ와 기초자산이 동일하고 상방만 절삭된다",
        "변동성이 큰 현 국면에서는 옵션 프리미엄이 커져 분배금이 방어적으로 보이지만, 대가는 반등 시 상단 포기"
      ],
      falsifier: [
        "해당 없음 — 매도 조건이 논지 그 자체",
        "다만 기준을 먼저 정해야 함: +3%가 원화 기준인지 달러 기준인지. 환율 때문에 도달 시점이 크게 달라진다"
      ],
      risk: "차트가 구조를 증명한다 — 2022년 이후 4년간 $54~62 박스에 갇혀 있고 수익은 전부 분배금에서 나왔다. 상방 절삭이 이론이 아니라 실측이다. +3%까지 기다리는 동안 그 기간만큼 코어 복리가 뒤처진다. 기다림의 비용을 계산에 넣을 것.",
      kpis: [
        { k: "조건", label: "매도 트리거", value: "+3%", prev: "달러 기준 평단 $60.18 → 목표 약 $62.0", asof: "2026-09-18" },
        { k: "배분", label: "매도 대금 처리", value: "QQQ 약 66% / 전력기기 약 34%", prev: "현재 두 그룹 비율 기준 · 전력기기 상한 35% 확인 필요", asof: "2026-09-18" }
      ],
      next: "+3% 도달 시점",
      sources: "",
      updated: "2026-09-10"
    }
  }
};

/* ==================== 이하 렌더러 ==================== */
(function () {
  "use strict";

  var T = window.THESIS;
  var STALE_DAYS = 90;
  var ALL_NAMES = [];
  Object.keys(T.cards).forEach(function (k) {
    ALL_NAMES = ALL_NAMES.concat(T.cards[k].match);
  });

  function daysSince(iso) {
    var d = new Date(iso + "T00:00:00");
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function injectStyle() {
    if (document.getElementById("gate-thesis-style")) return;
    var css = [
      ".gt-wrap{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.10);font-size:13px;line-height:1.62;color:rgba(255,255,255,.72)}",
      ".gt-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}",
      ".gt-tag{font-size:11px;letter-spacing:.02em;padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.62)}",
      ".gt-tag.core{border-color:rgba(90,190,130,.5);color:#7fd6a0}",
      ".gt-tag.sat{border-color:rgba(214,158,74,.5);color:#e0a95c}",
      ".gt-tag.out{border-color:rgba(255,255,255,.16);color:rgba(255,255,255,.45)}",
      ".gt-stale{font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(220,70,70,.16);color:#ef8b8b}",
      ".gt-claim{color:#fff;font-size:14px;font-weight:600;line-height:1.55;margin:0 0 12px}",
      ".gt-sec{margin:12px 0 0}",
      ".gt-lab{font-size:11px;letter-spacing:.06em;color:rgba(255,255,255,.40);margin-bottom:5px}",
      ".gt-wrap ul{margin:0;padding-left:16px}",
      ".gt-wrap li{margin:0 0 5px}",
      ".gt-wrap li::marker{color:rgba(255,255,255,.28)}",
      ".gt-fal li{color:#e8a3a3}",
      ".gt-risk{color:rgba(255,255,255,.62);background:rgba(255,255,255,.035);border-left:2px solid rgba(255,255,255,.14);padding:9px 12px;border-radius:0 6px 6px 0}",
      ".gt-kpi{display:flex;gap:10px;background:rgba(255,255,255,.04);border-radius:8px;padding:10px 12px;margin-bottom:6px}",
      ".gt-kpi .kk{flex:none;min-width:44px;font-size:11px;font-weight:700;color:rgba(255,255,255,.45);padding-top:3px}",
      ".gt-kpi .kb{flex:1;min-width:0}",
      ".gt-kpi .kl{font-size:11.5px;color:rgba(255,255,255,.45)}",
      ".gt-kpi .kv{font-size:17px;font-weight:700;color:#fff;line-height:1.25}",
      ".gt-kpi .kv.up{color:#8fd6a8}.gt-kpi .kv.dn{color:#e8918f}",
      ".gt-kpi .kp{font-size:11.5px;color:rgba(255,255,255,.52);line-height:1.5;margin-top:2px}",
      ".gt-kpi .ka{font-size:11px;color:rgba(255,255,255,.34);margin-top:2px}",
      ".gt-foot{margin-top:12px;font-size:11px;color:rgba(255,255,255,.34)}",
      ".gt-banner{margin:0 0 16px;padding:14px 16px;border-radius:12px;background:rgba(214,158,74,.09);border:1px solid rgba(214,158,74,.28)}",
      ".gt-banner h4{margin:0 0 8px;font-size:14px;color:#e8b877;font-weight:700;line-height:1.45}",
      ".gt-banner p{margin:0 0 8px;font-size:13px;line-height:1.62;color:rgba(255,255,255,.74)}",
      ".gt-banner .st{margin:0;font-size:11px;color:rgba(255,255,255,.42)}"
    ].join("");
    var el = document.createElement("style");
    el.id = "gate-thesis-style";
    el.textContent = css;
    document.head.appendChild(el);
  }

  function cardHTML(sym, c) {
    var stale = c.updated ? daysSince(c.updated) : 999;
    var tagCls = c.bucket === "코어" ? "core" : (c.bucket === "위성" ? "sat" : "out");
    var h = '<div class="gt-wrap" data-gt="' + esc(sym) + '">';

    h += '<div class="gt-head"><span class="gt-tag ' + tagCls + '">' + esc(c.bucket) + "</span>";
    if (stale > STALE_DAYS) {
      h += '<span class="gt-stale">논거 ' + stale + "일 경과 · 트랜치 잠금</span>";
    }
    h += "</div>";

    h += '<p class="gt-claim">' + esc(c.claim) + "</p>";

    var kl = c.kpis || (c.kpi ? [c.kpi] : []);
    if (kl.length) {
      h += '<div class="gt-sec"><div class="gt-lab">추적 지표 — 수준 · 가속도 · 질량</div>';
      kl.forEach(function (x) {
        var dc = x.dir === "down" ? "dn" : (x.dir === "up" ? "up" : "");
        h += '<div class="gt-kpi"><span class="kk">' + esc(x.k || "") + "</span>";
        h += '<div class="kb"><div class="kl">' + esc(x.label) + "</div>";
        h += '<div class="kv ' + dc + '">' + esc(x.value) + "</div>";
        if (x.prev) h += '<div class="kp">' + esc(x.prev) + "</div>";
        if (x.asof) h += '<div class="ka">' + esc(x.asof) + "</div>";
        h += "</div></div>";
      });
      h += "</div>";
    }

    if (c.evidence && c.evidence.length) {
      h += '<div class="gt-sec"><div class="gt-lab">근거</div><ul>';
      c.evidence.forEach(function (e) { h += "<li>" + esc(e) + "</li>"; });
      h += "</ul></div>";
    }

    if (c.falsifier && c.falsifier.length) {
      h += '<div class="gt-sec"><div class="gt-lab">반증 조건 — 사실이면 내가 틀린 것</div><ul class="gt-fal">';
      c.falsifier.forEach(function (e) { h += "<li>" + esc(e) + "</li>"; });
      h += "</ul></div>";
    }

    if (c.risk) {
      h += '<div class="gt-sec"><div class="gt-lab">리스크</div><div class="gt-risk">' + esc(c.risk) + "</div></div>";
    }

    h += '<div class="gt-foot">다음 확인 · ' + esc(c.next || "-");
    if (c.sources) h += "<br>출처 · " + esc(c.sources);
    h += "<br>갱신 · " + esc(c.updated) + "</div>";

    h += "</div>";
    return h;
  }

  // 화면에서 해당 종목의 보유 카드를 찾는다 (클래스명에 의존하지 않음)
  function findHost(names) {
    var nodes = document.querySelectorAll("div,section,article,li");
    var best = null, bestLen = Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.querySelector("[data-gt]")) continue;
      var t = el.textContent || "";
      if (t.indexOf("평단") === -1) continue;

      var hit = false;
      for (var j = 0; j < names.length; j++) {
        if (t.indexOf(names[j]) !== -1) { hit = true; break; }
      }
      if (!hit) continue;

      // 다른 종목까지 품고 있으면 카드가 아니라 목록 컨테이너
      var others = 0;
      for (var k = 0; k < ALL_NAMES.length; k++) {
        if (names.indexOf(ALL_NAMES[k]) !== -1) continue;
        if (t.indexOf(ALL_NAMES[k]) !== -1) { others++; break; }
      }
      if (others > 0) continue;

      if (t.length < bestLen) { bestLen = t.length; best = el; }
    }
    return best;
  }

  function renderCards() {
    Object.keys(T.cards).forEach(function (sym) {
      if (document.querySelector('[data-gt="' + sym + '"]')) return;
      var c = T.cards[sym];
      var host = findHost(c.match);
      if (!host) return;
      host.insertAdjacentHTML("beforeend", cardHTML(sym, c));
    });
  }

  function renderBanner() {
    if (document.getElementById("gt-banner")) return;
    var anchor = null;
    var nodes = document.querySelectorAll("h1,h2,h3,h4,h5,div,span,p");
    for (var i = 0; i < nodes.length; i++) {
      if ((nodes[i].textContent || "").trim() === "오늘의 판단") { anchor = nodes[i]; break; }
    }
    if (!anchor) return;

    var html = '<div class="gt-banner" id="gt-banner">' +
      "<h4>" + esc(T.common.title) + "</h4>" +
      "<p>" + esc(T.common.body) + "</p>" +
      "<p>" + esc(T.common.watch) + "</p>" +
      '<p class="st">' + esc(T.common.status) + "</p></div>";
    anchor.insertAdjacentHTML("beforebegin", html);
  }

  function run() {
    injectStyle();
    try { renderBanner(); } catch (e) {}
    try { renderCards(); } catch (e) {}
  }

  function boot() {
    run();
    // 데이터가 늦게 그려지는 경우 대비
    var tries = 0;
    var iv = setInterval(function () {
      run();
      if (++tries > 40) clearInterval(iv);  // 최대 약 20초
    }, 500);
    // 탭 전환 등 DOM 변경 대응
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () { run(); });
      mo.observe(document.body, { childList: true, subtree: true });
    }
    document.addEventListener("click", function () { setTimeout(run, 60); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
