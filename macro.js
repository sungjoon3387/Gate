/* ============================================================
   Gate — macro 렌더러 (1층 지표 + 2층 인과 사슬 + 3층 분기 맥락)

   설치: index.html 의 </body> 앞, refresh.js 아래
         <script src="macro.js"></script>

   1·2층은 macro.json 에서 읽습니다 (macro.py 가 매일 생성).
   3층은 아래 CONTEXT 블록에서 분기 1회 손으로 갱신합니다.
   ============================================================ */

window.MACRO_CONTEXT = {
  updated: "2026-09-14",
  note: "분기 1회 갱신. 판정에는 연결하지 않습니다 — 배경 이해용입니다.",
  blocks: [
    {
      region: "중동",
      weight: "높음 — 직접 경로",
      text: "오일머니가 유가·인플레 경로가 아니라 AI 인프라 직접투자 경로로 들어옵니다. 국부펀드가 미국 데이터센터에 자본을 대면 그건 곧 ETN·GEV의 수주 파이프라인입니다. 유가보다 SWF 투자 발표를 봐야 합니다.",
      watch: "사우디 PIF·UAE 관련 미국 데이터센터 투자 발표, 브렌트유",
      todo: "분기 1회 수동 갱신 — 정기 데이터셋 없음"
    },
    {
      region: "중국",
      weight: "낮음 — 인과가 길다",
      text: "미국채 보유 축소 → 장기금리 경로는 TIC 데이터가 2개월 지연되고 노이즈가 큽니다. 전력기기도 북미 시장은 사실상 차단돼 영향이 제한적입니다. 판정에는 쓰지 않습니다.",
      watch: "구리 가격, 위안화, TIC 보고서",
      todo: "참고용"
    },
    {
      region: "한국",
      weight: "중간 — 환율 수급",
      text: "원/달러를 실제로 움직이는 국내 변수는 금리차보다 수급입니다. 국민연금 해외투자와 환헤지 비율 조정, 서학개미 순매수, 경상수지가 축입니다.",
      watch: "국민연금 기금운용본부 공시(분기), 예탁결제원 세이브로 순매수",
      todo: "분기 1회 수동 갱신"
    }
  ]
};

(function () {
  "use strict";
  var C = window.MACRO_CONTEXT;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function num(v, unit) {
    if (v == null) return "-";
    var s = (Math.round(v * 1000) / 1000).toLocaleString("ko-KR");
    return s + (unit || "");
  }

  function sgn(v, unit) {
    if (v == null) return "-";
    var s = (v > 0 ? "+" : "") + (Math.round(v * 1000) / 1000);
    return s + (unit || "");
  }

  function style() {
    if (document.getElementById("gm-style")) return;
    var css = [
      "#gm{margin:0 0 20px}",
      ".gm-h{font-size:11px;letter-spacing:.06em;color:rgba(255,255,255,.40);margin:0 0 7px}",
      ".gm-box{border-radius:12px;border:1px solid rgba(255,255,255,.10);",
      "background:rgba(255,255,255,.028);padding:14px 16px;margin:0 0 12px}",
      ".gm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}",
      ".gm-i .l{font-size:11px;color:rgba(255,255,255,.45);margin-bottom:3px}",
      ".gm-i .v{font-size:19px;font-weight:700;color:#fff;line-height:1.15}",
      ".gm-i .d{font-size:11px;color:rgba(255,255,255,.42);margin-top:3px}",
      ".gm-up{color:#e8918f}.gm-dn{color:#7fa8e0}",
      ".gm-chain{border-radius:12px;border:1px solid rgba(255,255,255,.10);padding:14px 16px;margin:0 0 10px}",
      ".gm-chain h4{margin:0 0 4px;font-size:14px;font-weight:700;color:#fff}",
      ".gm-path{font-size:11px;color:rgba(255,255,255,.38);margin:0 0 9px;line-height:1.5}",
      ".gm-v{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;margin:0 0 8px}",
      ".gm-v.warn{background:rgba(220,80,80,.16);color:#ef8b8b}",
      ".gm-v.watch{background:rgba(214,158,74,.16);color:#e0a95c}",
      ".gm-v.ok{background:rgba(90,190,130,.15);color:#7fd6a0}",
      ".gm-chain p{margin:0;font-size:13px;line-height:1.62;color:rgba(255,255,255,.72)}",
      ".gm-ctx{border-left:2px solid rgba(255,255,255,.14);padding:2px 0 2px 12px;margin:0 0 12px}",
      ".gm-ctx .r{font-size:13px;font-weight:700;color:#fff}",
      ".gm-ctx .w{font-size:11px;color:rgba(255,255,255,.38);margin:2px 0 6px}",
      ".gm-ctx p{margin:0 0 5px;font-size:12.5px;line-height:1.6;color:rgba(255,255,255,.68)}",
      ".gm-err{font-size:11px;color:#ef8b8b;margin-top:8px}",
      ".gm-foot{font-size:11px;color:rgba(255,255,255,.32);margin-top:6px}"
    ].join("");
    var el = document.createElement("style");
    el.id = "gm-style";
    el.textContent = css;
    document.head.appendChild(el);
  }

  function vclass(v) {
    if (!v) return "";
    if (/경고|확대/.test(v) && !/소폭/.test(v)) return "warn";
    if (/관찰|소폭|역풍|스티프닝/.test(v)) return "watch";
    return "ok";
  }

  function indicatorHTML(i) {
    var order = ["real10", "ig", "ust2", "ust5", "ust10", "ust30", "be10", "dxy", "usdkrw"];
    var h = '<div class="gm-h">1층 · 판정을 바꾸는 지표</div><div class="gm-box"><div class="gm-grid">';
    order.forEach(function (k) {
      var d = i[k];
      if (!d) return;
      var cls = d.chg_60d > 0 ? "gm-up" : (d.chg_60d < 0 ? "gm-dn" : "");
      h += '<div class="gm-i"><div class="l">' + esc(d.label) + "</div>";
      h += '<div class="v">' + num(d.value, d.unit) + "</div>";
      h += '<div class="d">60일 <span class="' + cls + '">' + sgn(d.chg_60d) + "</span>";
      if (d.pctile_5y != null) h += " · 5년 백분위 " + d.pctile_5y + "%";
      h += "</div></div>";
    });
    h += "</div></div>";
    return h;
  }

  function chainHTML(chains) {
    var h = '<div class="gm-h">2층 · 인과 사슬</div>';
    chains.forEach(function (c) {
      h += '<div class="gm-chain"><h4>' + esc(c.title) + "</h4>";
      h += '<div class="gm-path">' + esc(c.path) + "</div>";
      if (c.verdict) h += '<span class="gm-v ' + vclass(c.verdict) + '">' + esc(c.verdict) + "</span>";
      h += "<p>" + esc(c.text) + "</p></div>";
    });
    return h;
  }

  function contextHTML() {
    var h = '<div class="gm-h">3층 · 분기 맥락 (판정 미연결)</div><div class="gm-box">';
    C.blocks.forEach(function (b) {
      h += '<div class="gm-ctx"><div class="r">' + esc(b.region) + "</div>";
      h += '<div class="w">비중 ' + esc(b.weight) + "</div>";
      h += "<p>" + esc(b.text) + "</p>";
      h += '<p style="color:rgba(255,255,255,.42)">볼 것 · ' + esc(b.watch) + "</p></div>";
    });
    h += '<div class="gm-foot">갱신 ' + esc(C.updated) + " · " + esc(C.note) + "</div></div>";
    return h;
  }

  // 금리 섹션 컨테이너 찾기 — "미국채 5년"과 "미국채 30년"을 함께 품은 최소 블록
  function findHost() {
    var nodes = document.querySelectorAll("div,section");
    var best = null, len = Infinity;
    for (var n = 0; n < nodes.length; n++) {
      var t = nodes[n].textContent || "";
      if (t.indexOf("미국채 5년") === -1) continue;
      if (t.indexOf("미국채 30년") === -1) continue;
      if (t.length < len) { len = t.length; best = nodes[n]; }
    }
    return best;
  }

  function render(doc) {
    if (document.getElementById("gm")) return;
    var host = findHost();
    if (!host) return;
    style();
    var h = '<div id="gm">';
    h += indicatorHTML(doc.indicators || {});
    h += chainHTML(doc.chains || []);
    h += contextHTML();
    if ((doc.errors || []).length) {
      h += '<div class="gm-err">수집 실패: ' + doc.errors.map(function (e) {
        return esc(e.src);
      }).join(" / ") + "</div>";
    }
    h += '<div class="gm-foot">macro 수집 ' + esc((doc.generated_at || "").slice(0, 16).replace("T", " ")) + "</div>";
    h += "</div>";
    host.insertAdjacentHTML("afterbegin", h);
  }

  var DOC = null;
  fetch("macro.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j) { DOC = j; render(j); } })
    .catch(function () {});

  var tries = 0;
  var iv = setInterval(function () {
    if (DOC) render(DOC);
    if (++tries > 40 || document.getElementById("gm")) clearInterval(iv);
  }, 500);
  document.addEventListener("click", function () {
    setTimeout(function () { if (DOC) render(DOC); }, 80);
  });
})();
