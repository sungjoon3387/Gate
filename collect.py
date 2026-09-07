#!/usr/bin/env python3
"""
Gate — 데이터 수집기

표준 라이브러리만 사용합니다. 외부 패키지 설치 불필요.
Yahoo Finance 차트 API에서 1년치 일봉을 받아 지표를 계산하고 data.json으로 저장합니다.
트랜치 발화 이력은 tranches.json에 누적됩니다.

실행: python3 collect.py
"""

import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE, "data.json")
TRANCHE_PATH = os.path.join(BASE, "tranches.json")

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=2y&interval=1d"

# 감시 대상. kind: position(보유), macro(참고지표)
SYMBOLS = [
    {"sym": "QQQ",       "name": "QQQ",            "kind": "position", "bucket": "core",   "ccy": "USD"},
    {"sym": "267260.KS", "name": "HD현대일렉트릭", "kind": "position", "bucket": "sector", "ccy": "KRW"},
    {"sym": "GEV",       "name": "GE 버노바",      "kind": "position", "bucket": "sector", "ccy": "USD"},
    {"sym": "ETN",       "name": "Eaton",          "kind": "position", "bucket": "sector", "ccy": "USD"},
    {"sym": "KRW=X",     "name": "달러원",         "kind": "macro",    "unit": "원"},
    {"sym": "^TNX",      "name": "미국채 10년",    "kind": "macro",    "unit": "%"},
    {"sym": "^FVX",      "name": "미국채 5년",     "kind": "macro",    "unit": "%"},
    {"sym": "^TYX",      "name": "미국채 30년",    "kind": "macro",    "unit": "%"},
    {"sym": "DX-Y.NYB",  "name": "달러지수",       "kind": "macro",    "unit": ""},
]

TRANCHE_LEVELS = [-15.0, -25.0, -35.0]   # 52주 고점 대비 낙폭 %
SECTOR_CEILING = 35.0                     # 섹터 합 상한 %


# ---------- 유틸 ----------

def fetch_json(url, retries=3):
    ctx = ssl.create_default_context()
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA,
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=25, context=ctx) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:      # noqa: BLE001
            last = e
            time.sleep(2 + i * 3)
    raise last


def sma(vals, n):
    if len(vals) < n:
        return None
    return sum(vals[-n:]) / n


def rsi(vals, n=14):
    """Wilder's RSI."""
    if len(vals) < n + 1:
        return None
    gains, losses = [], []
    for i in range(1, n + 1):
        d = vals[i] - vals[i - 1]
        gains.append(max(d, 0.0))
        losses.append(max(-d, 0.0))
    ag = sum(gains) / n
    al = sum(losses) / n
    for i in range(n + 1, len(vals)):
        d = vals[i] - vals[i - 1]
        ag = (ag * (n - 1) + max(d, 0.0)) / n
        al = (al * (n - 1) + max(-d, 0.0)) / n
    if al == 0:
        return 100.0
    rs = ag / al
    return 100.0 - (100.0 / (1.0 + rs))


def pct(a, b):
    if not b:
        return None
    return (a / b - 1.0) * 100.0


# ---------- 수집 ----------

def load_series(sym):
    """Yahoo 차트에서 (일자, 종가) 시계열을 뽑아온다."""
    raw = fetch_json(CHART.format(sym=urllib.parse.quote(sym)))
    res = raw["chart"]["result"][0]
    ts = res["timestamp"]
    closes = res["indicators"]["quote"][0]["close"]
    meta = res.get("meta", {})

    rows = [(t, c) for t, c in zip(ts, closes) if c is not None]
    if len(rows) < 30:
        raise ValueError(f"{sym}: 데이터가 부족합니다 ({len(rows)}건)")

    dates = [datetime.fromtimestamp(t, tz=timezone.utc).strftime("%Y-%m-%d") for t, _ in rows]
    vals = [float(c) for _, c in rows]
    return dates, vals, meta


def analyze(entry):
    sym = entry["sym"]
    dates, vals, meta = load_series(sym)

    price = vals[-1]
    prev = vals[-2] if len(vals) > 1 else price

    # 최근 252 거래일 = 대략 52주
    window = vals[-252:] if len(vals) >= 252 else vals
    high52 = max(window)
    low52 = min(window)

    ma200 = sma(vals, 200)
    ma20 = sma(vals, 20)

    out = {
        "symbol": sym,
        "name": entry["name"],
        "kind": entry["kind"],
        "price": round(price, 4),
        "prev_close": round(prev, 4),
        "day_pct": round(pct(price, prev), 2) if prev else None,
        "last_trade_date": dates[-1],
        "high52": round(high52, 4),
        "low52": round(low52, 4),
        "drawdown_pct": round(pct(price, high52), 2),
        "ma20": round(ma20, 4) if ma20 else None,
        "ma200": round(ma200, 4) if ma200 else None,
        "ma200_gap_pct": round(pct(price, ma200), 2) if ma200 else None,
        "rsi14": round(rsi(vals), 1),
        "spark": [round(v, 4) for v in vals[-60:]],
    }
    if entry["kind"] == "position":
        out["bucket"] = entry["bucket"]
        out["ccy"] = entry["ccy"]
    else:
        out["unit"] = entry.get("unit", "")

    # 60거래일 전 대비 — 추세 방향 참고용
    if len(vals) > 60:
        out["chg60_pct"] = round(pct(price, vals[-61]), 2)
    return out


# ---------- 트랜치 상태 ----------

def load_tranches():
    if os.path.exists(TRANCHE_PATH):
        try:
            with open(TRANCHE_PATH, encoding="utf-8") as f:
                return json.load(f)
        except Exception:  # noqa: BLE001
            pass
    return {"fired": {}, "history": []}


def update_tranches(state, quotes, today):
    """
    각 종목의 52주 고점 대비 낙폭이 계단에 도달하면 1회만 기록한다.
    고점이 갱신되면(현재가가 직전 기록 고점을 넘어서면) 계단이 초기화된다.
    """
    newly = []
    for q in quotes:
        if q.get("kind") != "position":
            continue
        sym = q["symbol"]
        st = state["fired"].setdefault(sym, {"high52": q["high52"], "levels": []})

        # 신고점 → 계단 리셋
        if q["high52"] > st.get("high52", 0) * 1.0001:
            st["high52"] = q["high52"]
            if st["levels"]:
                state["history"].append({
                    "date": today, "symbol": sym, "event": "reset",
                    "note": "52주 고점 갱신으로 계단 초기화",
                })
            st["levels"] = []

        dd = q["drawdown_pct"]
        for lv in TRANCHE_LEVELS:
            if dd <= lv and lv not in st["levels"]:
                st["levels"].append(lv)
                rec = {
                    "date": today, "symbol": sym, "name": q["name"],
                    "event": "tranche", "level": lv,
                    "price": q["price"], "drawdown": dd,
                }
                state["history"].append(rec)
                newly.append(rec)
        st["levels"].sort(reverse=True)
    state["history"] = state["history"][-200:]
    return newly


# ---------- 메인 ----------

def main():
    now = datetime.now(KST)
    quotes, errors = [], []

    for entry in SYMBOLS:
        try:
            quotes.append(analyze(entry))
            print(f"  ok   {entry['sym']}")
        except Exception as e:  # noqa: BLE001
            errors.append({"symbol": entry["sym"], "error": str(e)[:200]})
            print(f"  FAIL {entry['sym']}: {e}", file=sys.stderr)

    if not quotes:
        print("수집 실패 — 기존 data.json을 유지합니다.", file=sys.stderr)
        return 1

    tranche_state = load_tranches()
    newly = update_tranches(tranche_state, quotes, now.strftime("%Y-%m-%d"))

    payload = {
        "generated_at": now.isoformat(timespec="seconds"),
        "generated_at_label": now.strftime("%Y-%m-%d %H:%M KST"),
        "sector_ceiling": SECTOR_CEILING,
        "tranche_levels": TRANCHE_LEVELS,
        "quotes": {q["symbol"]: q for q in quotes},
        "tranches": tranche_state["fired"],
        "tranche_history": list(reversed(tranche_state["history"]))[:40],
        "fired_today": newly,
        "errors": errors,
    }

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
    with open(TRANCHE_PATH, "w", encoding="utf-8") as f:
        json.dump(tranche_state, f, ensure_ascii=False, indent=1)

    print(f"완료 — {len(quotes)}건 수집, 실패 {len(errors)}건, 신규 트랜치 {len(newly)}건")
    return 0


if __name__ == "__main__":
    sys.exit(main())
