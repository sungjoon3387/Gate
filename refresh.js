/* ============================================================
   Gate — 수동 새로고침 버튼

   설치: index.html 의 </body> 앞, thesis.js 아래 한 줄 추가
         <script src="refresh.js"></script>

   하는 일
     1) data.json 을 cache:'reload' 로 네트워크에서 강제로 다시 받음
        (같은 URL·같은 캐시키로 받아야 브라우저 캐시가 실제로 갱신됨.
         ?t=123 을 붙이면 캐시키가 달라져 페이지 재로드 때 무의미해짐)
     2) 수집 시각이 화면 것보다 새로우면 페이지 리로드
     3) 같으면 "이미 최신" + 마지막 수집 시각 표시

   한계: 이건 '브라우저가 낡은 걸 보여주는 문제'만 고칩니다.
        GitHub Actions 를 다시 돌려 데이터를 새로 수집하려면
        Pages Functions 프록시가 따로 필요합니다.
   ============================================================ */
(function () {
  "use strict";

  var TIME_KEYS = ["generated_at", "generatedAt", "updated_at", "updated", "asof", "as_of", "ts", "time"];
  var busy = false;

  function pickTime(o) {
    if (!o || typeof o !== "object") return null;
    for (var i = 0; i < TIME_KEYS.length; i++) {
      if (o[TIME_KEYS[i]]) return String(o[TIME_KEYS[i]]);
    }
    return null;
  }

  function kst(s) {
    var d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false
    }).format(d) + " KST";
  }

  function style() {
    if (document.getElementById("gr-style")) return;
    var css = [
      "#gr-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;",
      "margin-left:10px;padding:5px 11px;border-radius:999px;cursor:pointer;",
      "font-size:12px;font-weight:600;line-height:1;vertical-align:middle;",
      "background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);",
      "color:rgba(255,255,255,.78);-webkit-tap-highlight-color:transparent;",
      "font-family:inherit;transition:opacity .15s}",
      "#gr-btn:active{opacity:.55}",
      "#gr-btn[disabled]{opacity:.45;cursor:default}",
      "#gr-btn .ic{display:inline-block;font-size:13px}",
      "#gr-btn.spin .ic{animation:gr-rot .9s linear infinite}",
      "@keyframes gr-rot{to{transform:rotate(360deg)}}",
      "#gr-btn.fixed{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));",
      "z-index:9999;margin:0;padding:10px 15px;font-size:13px;",
      "background:rgba(30,32,36,.94);backdrop-filter:blur(8px);",
      "box-shadow:0 4px 16px rgba(0,0,0,.4)}",
      "#gr-toast{position:fixed;left:50%;transform:translateX(-50%);",
      "bottom:calc(78px + env(safe-area-inset-bottom));z-index:10000;",
      "max-width:86vw;padding:11px 16px;border-radius:10px;",
      "background:rgba(28,30,34,.96);border:1px solid rgba(255,255,255,.14);",
      "color:#fff;font-size:13px;line-height:1.5;text-align:center;",
      "box-shadow:0 6px 22px rgba(0,0,0,.5);opacity:0;transition:opacity .2s;",
      "pointer-events:none}",
      "#gr-toast.on{opacity:1}"
    ].join("");
    var el = document.createElement("style");
    el.id = "gr-style";
    el.textContent = css;
    document.head.appendChild(el);
  }

  function toast(msg, ms) {
    var t = document.getElementById("gr-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "gr-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function () { t.classList.add("on"); });
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove("on"); }, ms || 2600);
  }

  // 화면 헤더의 수집 시각 텍스트 (예: "2026-09-10 08:18 KST")
  function screenStamp() {
    var nodes = document.querySelectorAll("div,span,p,small,time,h1,h2,h3");
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || "").trim();
      if (t.length < 40 && /KST/.test(t) && nodes[i].children.length === 0) return t;
    }
    return null;
  }

  function place(btn) {
    var nodes = document.querySelectorAll("div,span,p,small,time");
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || "").trim();
      if (t.length < 40 && /KST/.test(t) && nodes[i].children.length === 0) {
        nodes[i].appendChild(btn);
        return true;
      }
    }
    btn.classList.add("fixed");
    document.body.appendChild(btn);
    return false;
  }

  function run(btn) {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    btn.classList.add("spin");

    var before = screenStamp();

    fetch("data.json", { cache: "reload" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (j) {
        var gen = pickTime(j);
        var genTxt = gen ? kst(gen) : null;

        // 화면 표시와 새로 받은 수집 시각이 다르면 낡은 화면이었던 것
        var stale = true;
        if (before && genTxt) {
          var norm = function (s) { return s.replace(/[^0-9]/g, ""); };
          stale = norm(before).slice(-8) !== norm(genTxt).slice(-8);
        }

        if (stale) {
          toast("새 데이터 확인 — 화면을 갱신합니다", 1400);
          setTimeout(function () { location.reload(); }, 700);
          return;
        }

        toast("이미 최신입니다" + (genTxt ? "\n마지막 수집 " + genTxt : ""), 2800);
        btn.disabled = false;
        btn.classList.remove("spin");
        busy = false;
      })
      .catch(function (e) {
        toast("갱신 실패 — " + String(e.message || e).slice(0, 50), 3000);
        btn.disabled = false;
        btn.classList.remove("spin");
        busy = false;
      });
  }

  function boot() {
    if (document.getElementById("gr-btn")) return;
    style();
    var btn = document.createElement("button");
    btn.id = "gr-btn";
    btn.type = "button";
    btn.innerHTML = '<span class="ic">⟳</span><span>새로고침</span>';
    btn.addEventListener("click", function () { run(btn); });
    place(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  setTimeout(boot, 1200);   // 헤더가 늦게 그려지는 경우 대비
})();
