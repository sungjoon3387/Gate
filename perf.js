/* ============================================================
   Gate — 성과 (세후 · 손익 분해 · 시중금리 대비)

   설치: index.html 의 </body> 앞, macro.js 아래
         <script src="perf.js"></script>

   index.html 의 보유 탭과 역할이 다릅니다.
     index.html  종목별 수익률을 '비율(%)' 로. 비율은 곱으로 결합됩니다.
     perf.js     포트폴리오 전체를 '금액(원)' 으로. 금액은 합으로 분해됩니다.

   손익 분해 (정확히 더해집니다 — 교차항 없음)
     주가 기여 = (현재가 − 달러평단) × 수량 × 현재환율
     환율 기여 = 달러평단 × 수량 × (현재환율 − 매수환율)
     두 값의 합 = 세전 평가손익

     주가 기여를 '현재 환율' 로 환산하는 것이 핵심입니다.
     '매수 당시 환율' 로 환산하면 교차항이 생겨 세 숫자를 읽어야 합니다.

   읽지 않는 것
     배당·분배금. JEPQ 는 분배금이 수익의 본체이므로 실제 총수익은 더 높습니다.
   ============================================================ */

window.PERF_CONFIG = {
  /* ---- 세금 ---- */
  overseas_tax_rate: 0.22,        // 해외주식 양도소득세 (지방소득세 포함)
  overseas_deduction: 2500000,    // 연간 기본공제
  realized_gain_krw: 0,           // 올해 이미 실현한 해외주식 양도차익 (원)

  // 양도소득세 연도 귀속은 '결제일' 기준입니다. 12월 말 매도는 다음 해로
  // 넘어갈 수 있습니다. 증권사마다 처리일이 달라 반드시 확인 후 입력하세요.
  tax_year_cutoff: "",            // 예: "2026-12-26". 빈 값이면 안내만 표시

  /* ---- 비교 대상 (세전 연이율 %) ---- */
  deposit_rate: 3.2,              // 1년 정기예금. 본인 조건으로 고치세요
  deposit_tax: 0.154,             // 이자소득세 15.4%
  kr_base_rate: 3.00,             // 한국은행 기준금리 (macro.json 에 있으면 그 값 우선)

  /* ---- JEPQ 매도 규칙 ---- */
  jepq_trigger_pct: 0.03,         // +3%
  jepq_basis: "usd"               // "usd" = 달러·주가 기준 (확정 2026-10-15)
                                  // 매도 대금을 원화로 빼지 않고 재투자하므로 환율은 중립
};

(function () {
  "use strict";
  var C = window.PERF_CONFIG, D = null, M = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function won(n) { return n == null ? "—" : Math.round(n).toLocaleString("ko-KR") + "원"; }
  function swon(n) { return n == null ? "—" : (n >= 0 ? "+" : "") + won(n); }
  function pct(n, d) { return n == null ? "—" : (n > 0 ? "+" : "") + n.toFixed(d == null ? 2 : d) + "%"; }
  function ud(n) { return n == null ? "" : (n >= 0 ? "up" : "dn"); }

  /* 내부수익률 — 이분법 */
  function xirr(flows) {
    if (!flows || flows.length < 2) return null;
    var t0 = new Date(flows[0].d).getTime();
    function npv(r) {
      var s = 0;
      for (var i = 0; i < flows.length; i++) {
        var yr = (new Date(flows[i].d).getTime() - t0) / (365.25 * 864e5);
        s += flows[i].v / Math.pow(1 + r, yr);
      }
      return s;
    }
    var lo = -0.95, hi = 10;
    if (npv(lo) * npv(hi) > 0) return null;
    for (var k = 0; k < 200; k++) {
      var mid = (lo + hi) / 2;
      if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2 * 100;
  }

  function daysUntil(iso) {
    if (!iso) return null;
    var d = new Date(iso + "T23:59:59+09:00").getTime();
    return Math.ceil((d - Date.now()) / 864e5);
  }

  /* ---------- 계산 ---------- */

  function compute() {
    var H = window.HOLDINGS;
    if (!H || !D) return null;
    var Q = D.quotes || {};
    var fxq = Q["KRW=X"];
    var fx = fxq ? fxq.price : null;

    var cost = 0, value = 0, gPx = 0, gFx = 0;
    var costUSD = 0, costKRWofUSD = 0;
    var rows = [], missing = [], noSplit = [];

    (H.positions || []).forEach(function (p) {
      if (!p.shares) return;
      var q = Q[p.sym] || {};

      if (q.price == null) { missing.push(p.sym); return; }

      var isUSD = q.ccy === "USD" || p.avg_usd != null;
      var px = isUSD && fx ? q.price * fx : q.price;
      var c = (p.avg_krw || 0) * p.shares;
      var v = px * p.shares;
      cost += c; value += v;

      // 손익 분해 — 달러 종목이고 avg_usd 가 있을 때만
      if (isUSD && fx && p.avg_usd && p.avg_krw) {
        var basis = p.avg_krw / p.avg_usd;           // 이 종목의 내재 매수 환율
        gPx += (q.price - p.avg_usd) * p.shares * fx;
        gFx += p.avg_usd * p.shares * (fx - basis);
        costUSD += p.avg_usd * p.shares;
        costKRWofUSD += c;
      } else if (isUSD) {
        noSplit.push(p.sym);
      }

      rows.push({
        sym: p.sym, c: c, v: v, g: v - c,
        r: c ? (v / c - 1) * 100 : null,
        usd: isUSD ? q.price : null, avg_usd: p.avg_usd
      });
    });

    if (!cost) return null;

    var cashKRW = H.cash_krw || 0;
    var cashUSD = (H.cash_usd || 0) * (fx || 0);
    var gain = value - cost;

    // 세금 — 지금 전량 매도 가정
    var used = C.realized_gain_krw || 0;
    var deductLeft = Math.max(0, (C.overseas_deduction || 0) - used);
    var taxable = Math.max(0, gain - deductLeft);
    var tax = taxable * (C.overseas_tax_rate || 0);

    return {
      fx: fx, fxq: fxq,
      cost: cost, value: value, gain: gain,
      gPx: gPx, gFx: gFx,
      fxBasis: costUSD ? costKRWofUSD / costUSD : null,
      costUSD: costUSD,
      cashKRW: cashKRW, cashUSD: cashUSD,
      total: value + cashKRW + cashUSD,
      deductLeft: deductLeft, taxable: taxable, tax: tax,
      netGain: gain - tax,
      rows: rows, missing: missing, noSplit: noSplit,
      H: H, Q: Q
    };
  }

  /* ---------- 화면 ---------- */

  function build() {
    var S = compute();
    if (!S) return "";

    var h = '<div id="gp">';

    /* 0. 시세 누락 경고 — 조용히 0원 처리하지 않는다 */
    if (S.missing.length) {
      h += '<div class="gp-warn"><b>시세 없음 — 성과 계산에서 제외됨</b>' +
        esc(S.missing.join(", ")) +
        ' 의 가격이 data.json 에 없습니다. 원금·평가액·세금이 모두 과소 계상됩니다. ' +
        'collect.py 의 SYMBOLS 목록을 확인하세요.</div>';
    }

    /* 1. 세후 평가손익 */
    h += '<div class="gp-h">성과 — 세후 기준</div><div class="gp-box">';
    h += '<div class="gp-big"><div class="l">세후 평가손익</div>' +
      '<div class="v ' + ud(S.netGain) + '">' + swon(S.netGain) + "</div>" +
      '<div class="d">원금 대비 ' + pct(S.netGain / S.cost * 100) +
      " · 세전 " + swon(S.gain) + " (" + pct(S.gain / S.cost * 100) + ")</div></div>";

    /* 2. 손익 분해 — 이 블록이 핵심이다 */
    if (S.gPx || S.gFx) {
      h += '<div class="gp-split">';
      h += '<div class="gp-sp"><div class="l">주가 기여</div><div class="v ' + ud(S.gPx) + '">' +
        swon(S.gPx) + '</div><div class="d">달러 기준 등락을 오늘 환율로 환산</div></div>';
      h += '<div class="gp-sp"><div class="l">환율 기여</div><div class="v ' + ud(S.gFx) + '">' +
        swon(S.gFx) + '</div><div class="d">매수 환율 대비 변동분</div></div>';
      h += "</div>";

      var sum = S.gPx + S.gFx;
      var drift = Math.abs(sum - S.gain);
      h += '<p class="gp-note">두 값의 합 ' + swon(sum) + ' 은 세전 손익과 같습니다' +
        (drift > 1000 ? ' <b style="color:var(--warn,#DFA33C)">(검산 불일치 ' + won(drift) + ' — 분해 로직 확인 필요)</b>' : '') +
        '. 금액은 더해지지만 <b>비율은 곱해집니다</b> — 보유 탭의 % 세 칸은 합이 맞지 않는 것이 정상입니다.</p>';

      // 주가와 환율이 반대 방향일 때 한 줄 해석
      if (S.gPx > 0 && S.gFx < 0 && Math.abs(S.gFx) > S.gPx) {
        h += '<p class="gp-note" style="color:var(--warn,#DFA33C)">' +
          '주가로는 ' + swon(S.gPx) + ' 벌었지만 환율이 ' + swon(S.gFx) +
          ' 를 깎아 전체가 손실입니다. 종목 선택이 아니라 환율이 수익률을 결정하고 있는 구간입니다.</p>';
      } else if (S.gFx > 0 && S.gPx < 0 && S.gFx > Math.abs(S.gPx)) {
        h += '<p class="gp-note">주가 손실 ' + swon(S.gPx) + ' 을 환율 ' + swon(S.gFx) +
          ' 가 덮고 있습니다. 달러 자산이 완충 역할을 하는 구간입니다.</p>';
      }
    }
    if (S.noSplit.length) {
      h += '<p class="gp-note">' + esc(S.noSplit.join(", ")) +
        ' 은 holdings.js 에 avg_usd 가 없어 <b>분해 불가</b>입니다 (합계에는 포함).</p>';
    }

    /* 3. 자산 구성 */
    h += '<div class="gp-row"><span>원금</span><b>' + won(S.cost) + "</b></div>";
    h += '<div class="gp-row"><span>평가액</span><b>' + won(S.value) + "</b></div>";
    if (S.cashKRW) h += '<div class="gp-row"><span>대기 현금 (원화)</span><b>' + won(S.cashKRW) + "</b></div>";
    if (S.cashUSD) h += '<div class="gp-row"><span>대기 현금 (달러)</span><b>' + won(S.cashUSD) +
      '<small>$' + Math.round(S.H.cash_usd).toLocaleString("en-US") + " · 환전 전</small></b></div>";
    h += '<div class="gp-row"><span>총자산</span><b>' + won(S.total) + "</b></div>";
    h += "</div>";

    /* 4. 환율 */
    if (S.fx && S.fxBasis) {
      var gap = (S.fx / S.fxBasis - 1) * 100;
      h += '<div class="gp-h">환율</div><div class="gp-box">';
      h += '<div class="gp-row"><span>내 달러 자산 매수 환율</span><b>' +
        Math.round(S.fxBasis).toLocaleString("ko-KR") + "원<small>달러 원금 $" +
        Math.round(S.costUSD).toLocaleString("en-US") + " 가중평균</small></b></div>";
      h += '<div class="gp-row"><span>현재 환율</span><b class="' + ud(gap) + '">' +
        Math.round(S.fx).toLocaleString("ko-KR") + "원<small>평단 대비 " + pct(gap) + "</small></b></div>";
      if (S.fxq && S.fxq.ma200_gap_pct != null) {
        h += '<div class="gp-row"><span>200일선 대비</span><b>' + pct(S.fxq.ma200_gap_pct) +
          "<small>200일선 " + Math.round(S.fxq.ma200).toLocaleString("ko-KR") + "원</small></b></div>";
      }
      if (S.fxq && S.fxq.dev_pctile != null && S.fxq.dev_years >= 2.0) {
        h += '<div class="gp-row"><span>이격도 분위</span><b>' + S.fxq.dev_pctile.toFixed(0) +
          "%<small>" + S.fxq.dev_years + "년 이력 · 하위면 달러가 싼 구간</small></b></div>";
      }
      h += '<p class="gp-note">현재 환율이 매수 환율보다 낮으면 추가 환전이 평단을 낮춥니다. ' +
        '표시된 환율은 <b>전일 서울 종가</b> 기준이고, 실제 체결은 밤 22:30 이후 역외 환율이 적용되어 차이가 납니다.</p>';
      h += "</div>";
    }

    /* 5. 세금 */
    h += '<div class="gp-h">세금</div><div class="gp-box">';
    h += '<div class="gp-row"><span>양도소득세 기본공제 잔액</span><b>' + won(S.deductLeft) + "</b></div>";
    h += '<div class="gp-row"><span>지금 전량 매도 시</span><b>' + won(S.tax) +
      (S.tax === 0 ? "<small>공제 범위 안</small>"
                   : "<small>차익 " + won(S.taxable) + " × 22%</small>") + "</b></div>";
    var dleft = daysUntil(C.tax_year_cutoff);
    if (dleft != null) {
      h += '<div class="gp-row"><span>올해 귀속 매도 마감</span><b class="' + (dleft <= 14 ? "dn" : "") + '">D-' +
        dleft + "<small>" + esc(C.tax_year_cutoff) + " · 결제일 기준</small></b></div>";
    } else {
      h += '<p class="gp-note"><b>양도소득세 연도 귀속은 매도일이 아니라 결제일 기준입니다.</b> ' +
        '12월 말 매도는 다음 해로 넘어가 올해 공제 250만원을 못 쓸 수 있습니다. ' +
        '증권사에 마감일을 확인해 PERF_CONFIG.tax_year_cutoff 에 넣으세요.</p>';
    }
    h += '<p class="gp-note">세금은 종목별이 아니라 연간 합산 차익에 매겨집니다. ' +
      '손실 종목을 같은 해에 팔면 이익과 상계되어 세금이 줄어듭니다.</p>';
    h += "</div>";

    /* 6. 시중금리 비교 */
    h += '<div class="gp-h">시중금리와 비교</div><div class="gp-box">';
    var depNet = C.deposit_rate * (1 - C.deposit_tax);
    h += '<div class="gp-row"><span>정기예금 ' + C.deposit_rate.toFixed(1) + "%</span><b>" +
      depNet.toFixed(2) + "%<small>이자소득세 15.4% 차감 후</small></b></div>";

    var krBase = (M && M.indicators && M.indicators.kr_base && M.indicators.kr_base.value) || C.kr_base_rate;
    if (krBase) {
      h += '<div class="gp-row"><span>한국은행 기준금리</span><b>' + krBase.toFixed(2) + "%</b></div>";
    }
    var ffr = M && M.indicators && M.indicators.ffr ? M.indicators.ffr.value : null;
    if (ffr != null) {
      h += '<div class="gp-row"><span>미 정책금리 상단</span><b>' + ffr.toFixed(2) +
        "%<small>달러 무위험 수익률 · 환율 변동은 별도</small></b></div>";
      if (krBase) {
        h += '<div class="gp-row"><span>한미 금리차</span><b>' + (ffr - krBase).toFixed(2) +
          "%p<small>벌어지면 원화 약세 압력</small></b></div>";
      }
    }

    var ann = null;
    if (S.H.flows && S.H.flows.length) {
      var f = S.H.flows.slice();
      f.push({ d: new Date().toISOString().slice(0, 10), v: S.total });
      ann = xirr(f);
    }
    if (ann != null) {
      var edge = ann - depNet;
      h += '<div class="gp-row"><span>내 연환산 수익률</span><b class="' + ud(ann) + '">' +
        pct(ann) + "<small>내부수익률 · 실제 입금 시점 반영</small></b></div>";
      h += '<div class="gp-row"><span>예금 대비</span><b class="' + ud(edge) + '">' +
        (edge >= 0 ? "+" : "") + edge.toFixed(2) + "%p<small>" +
        (edge >= 0 ? "위험을 진 대가를 받고 있습니다" : "위험을 지고도 예금보다 못합니다") +
        "</small></b></div>";
    } else {
      h += '<p class="gp-note">연환산 비교는 입금 날짜가 있어야 계산됩니다. ' +
        'holdings.js 에 flows(입금일·금액, 입금은 음수)를 넣으면 내부수익률로 비교합니다.</p>';
    }
    h += "</div>";

    /* 7. JEPQ 매도 트리거 */
    var jp = (S.H.positions || []).filter(function (p) { return p.sym === "JEPQ" && p.shares > 0; })[0];
    if (jp) {
      var jq = S.Q["JEPQ"];
      h += '<div class="gp-h">JEPQ 매도 트리거</div><div class="gp-box">';
      if (!jq || jq.price == null) {
        h += '<p class="gp-note" style="color:var(--warn,#DFA33C)">' +
          'JEPQ 시세가 없어 트리거를 계산할 수 없습니다. collect.py 의 SYMBOLS 에 JEPQ 를 추가하세요.</p>';
      } else if (C.jepq_basis === "usd" && jp.avg_usd) {
        var tgt = jp.avg_usd * (1 + C.jepq_trigger_pct);
        var cur = jq.price;
        var left = (tgt / cur - 1) * 100;
        var hit = cur >= tgt;
        h += '<div class="gp-row"><span>현재가</span><b>$' + cur.toFixed(2) +
          "<small>평단 $" + jp.avg_usd.toFixed(2) + " 대비 " + pct((cur / jp.avg_usd - 1) * 100) + "</small></b></div>";
        h += '<div class="gp-row"><span>목표 (달러·주가 +' + (C.jepq_trigger_pct * 100).toFixed(0) + '%)</span><b>$' +
          tgt.toFixed(2) + "</b></div>";
        h += '<div class="gp-row"><span>남은 거리</span><b class="' + (hit ? "up" : "") + '">' +
          (hit ? "도달 — 전량 매도" : pct(left) + " 상승 필요") +
          "<small>" + jp.shares + "주 · 평가 " + won(cur * S.fx * jp.shares) + "</small></b></div>";
        h += '<p class="gp-note"><b>분배금은 이 계산에 들어 있지 않습니다.</b> ' +
          'JEPQ 는 분배금이 수익의 본체이므로 실제 총수익은 더 높습니다. ' +
          '매도 대금은 QQQ 약 66% / 전력기기 약 34% 로 재배분합니다.</p>';
      }
      h += "</div>";
    }

    /* 8. 종목별 기여 (금액) */
    h += '<div class="gp-h">종목별 기여</div><div class="gp-box">';
    S.rows.sort(function (a, b) { return b.g - a.g; }).forEach(function (x) {
      h += '<div class="gp-row"><span>' + esc(x.sym) + "<small>원금 " + won(x.c) + "</small></span>" +
        '<b class="' + ud(x.g) + '">' + swon(x.g) + "<small>" + pct(x.r, 1) + "</small></b></div>";
    });
    h += '<p class="gp-note"><b>이 화면의 모든 수치는 배당·분배금을 제외한 주가 기준입니다.</b> ' +
      '해외주식 배당은 지급 시 15% 원천징수되며 금융소득종합과세 대상입니다.</p>';
    h += "</div></div>";

    return h;
  }

  /* ---------- 스타일 ---------- */

  function style() {
    if (document.getElementById("gp-style")) return;
    var css = [
      "#gp{margin:0 0 20px}",
      ".gp-h{font-size:13px;font-weight:700;color:var(--muted,#8B9AAE);margin:18px 0 8px}",
      ".gp-h:first-child{margin-top:0}",
      ".gp-box{border-radius:12px;border:1px solid var(--line,#2C3849);",
      "background:var(--surface,#1B2330);padding:15px 16px}",
      ".gp-big{padding-bottom:12px;margin-bottom:6px;border-bottom:1px solid var(--line,#2C3849)}",
      ".gp-big .l{font-size:12.5px;color:var(--muted,#8B9AAE)}",
      ".gp-big .v{font-size:26px;font-weight:700;line-height:1.2;margin:3px 0}",
      ".gp-big .d{font-size:12px;color:var(--dim,#5F6E80)}",
      ".gp-split{display:flex;gap:8px;margin:12px 0 4px}",
      ".gp-sp{flex:1;background:var(--surface2,#222C3B);border-radius:8px;padding:10px 12px;min-width:0}",
      ".gp-sp .l{font-size:11.5px;color:var(--dim,#5F6E80)}",
      ".gp-sp .v{font-size:17px;font-weight:700;line-height:1.25;margin:2px 0;",
      "white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".gp-sp .d{font-size:11px;color:var(--dim,#5F6E80);line-height:1.45}",
      ".gp-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 0;",
      "border-bottom:1px solid var(--line,#2C3849)}",
      ".gp-row:last-of-type{border-bottom:0}",
      ".gp-row span{font-size:13px;color:var(--muted,#8B9AAE)}",
      ".gp-row b{font-weight:700;text-align:right;color:var(--text,#E6EBF2);white-space:nowrap}",
      ".gp-row small{display:block;font-weight:400;font-size:11.5px;color:var(--dim,#5F6E80);",
      "margin-top:1px;white-space:normal}",
      ".gp-row span small{text-align:left}",
      "#gp .up{color:var(--up,#F0524F)}#gp .dn{color:var(--down,#4C8DF0)}",
      ".gp-note{font-size:11.5px;color:var(--dim,#5F6E80);line-height:1.6;margin-top:11px}",
      ".gp-note b{color:var(--muted,#8B9AAE)}",
      ".gp-warn{border-radius:12px;border:1px solid var(--warn,#DFA33C);",
      "background:rgba(223,163,60,.08);padding:13px 15px;margin-bottom:14px;",
      "font-size:12.5px;line-height:1.6;color:var(--muted,#8B9AAE)}",
      ".gp-warn b{display:block;color:var(--warn,#DFA33C);font-size:13px;margin-bottom:4px}"
    ].join("");
    var el = document.createElement("style");
    el.id = "gp-style";
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---------- 렌더 ----------
     index.html 의 render() 가 #book 의 innerHTML 을 통째로 덮어쓰므로
     한 번 붙이고 끝내지 않고 계속 다시 붙입니다. macro.js 와 같은 방식입니다. */

  function paint() {
    var el = document.getElementById("book");
    if (!el || el.querySelector("#gp")) return;
    var h = build();
    if (!h) return;
    style();
    el.insertAdjacentHTML("afterbegin", h);
  }

  function reload() {
    var g = document.getElementById("gp");
    if (g && g.parentNode) g.parentNode.removeChild(g);
    paint();
  }

  fetch("data.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j) { D = j; reload(); } })
    .catch(function () {});

  fetch("macro.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j) { M = j; reload(); } })
    .catch(function () {});

  if (window.MutationObserver) {
    new MutationObserver(function () { paint(); })
      .observe(document.body, { childList: true, subtree: true });
  }
  setInterval(paint, 1000);
  document.addEventListener("click", function () { setTimeout(paint, 80); });
})();
