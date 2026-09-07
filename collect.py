#!/usr/bin/env python3
"""
Gate — 데이터 수집기 v2

Yahoo가 GitHub Actions IP를 429로 막는 문제 때문에 소스를 다중화했습니다.
심볼마다 소스를 순서대로 시도하고, 처음 성공한 것을 씁니다.
어떤 소스가 먹혔는지 로그와 data.json에 남기므로, 안 되는 소스는 나중에 지우면 됩니다.

  stooq : https://stooq.com/q/d/l/  — CSV, 키 없음, 봇 차단 거의 없음
  naver : api.finance.naver.com    — 국내 종목용
  yahoo : query1.finance.yahoo.com — 최후 수단

표준 라이브러리만 사용합니다.
"""

import csv
import io
import json
import os
import random
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

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

# 심볼별 소스 후보. (소스이름, 그 소스에서의 코드) 순서대로 시도합니다.
SYMBOLS = [
    {"sym": "QQQ", "name": "QQQ", "kind": "position", "bucket": "core", "ccy": "USD",
     "src": [("stooq", "qqq.us"), ("yahoo", "QQQ")]},
    {"sym": "267260.KS", "name": "HD현대일렉트릭", "kind": "position", "bucket": "sector", "ccy": "KRW",
     "src": [("naver", "267260"), ("stooq", "267260.kr"), ("yahoo", "267260.KS")]},
    {"sym": "GEV", "name": "GE 버노바", "kind": "position", "bucket": "sector", "ccy": "USD",
     "src": [("stooq", "gev.us"), ("yahoo", "GEV")]},
    {"sym": "ETN", "name": "Eaton", "kind": "position", "bucket": "sector", "ccy": "USD",
     "src": [("stooq", "etn.us"), ("yahoo", "ETN")]},

    {"sym": "KRW=X", "name": "달러원", "kind": "macro", "unit": "원",
     "src": [("stooq", "usdkrw"), ("yahoo", "KRW=X")]},
    {"sym": "^FVX", "name": "미국채 5년", "kind": "macro", "unit": "%",
     "src": [("stooq", "5usy.b"), ("yahoo", "^FVX")]},
    {"sym": "^TNX", "name": "미국채 10년", "kind": "macro", "unit": "%",
     "src": [("stooq", "10usy.b"), ("yahoo", "^TNX")]},
    {"sym": "^TYX", "name": "미국채 30년", "kind": "macro", "unit": "%",
     "src": [("stooq", "30usy.b"), ("yahoo", "^TYX")]},
    {"sym": "DX-Y.NYB", "name": "달러지수", "kind": "macro", "unit": "",
     "src": [("stooq", "dx.f"), ("yahoo", "DX-Y.NYB")]},
]

TRANCHE_LEVELS = [-15.0, -25.0, -35.0]
SECTOR_CEILING = 35.0


# ---------- HTTP ----------

def fetch(url, retries=2, expect_json=False):
    ctx = ssl.create_default_context()
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA,
                "Accept": "*/*",
                "Accept-Language": "ko,en;q=0.8",
            })
            with urllib.request.urlopen(req, timeout=20, context=ctx) as r:
                body = r.read().decode("utf-8", errors="replace")
            return json.loads(body) if expect_json else body
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 + i * 2 + random.random())
    raise last


# ---------- 소스별 시계열 로더 ----------
# 모두 (dates, closes) 를 오래된 것 → 최신 순으로 돌려줍니다.

def from_stooq(code):
    end = datetime.now(KST)
    start = end - timedelta(days=800)
    url = ("https://stooq.com/q/d/l/?s=" + urllib.parse.quote(code) +
           "&d1=" + start.strftime("%Y%m%d") +
           "&d2=" + end.strftime("%Y%m%d") + "&i=d")
    body = fetch(url)
    if not body or body.lstrip().lower().startswith("no data"):
        raise ValueError("stooq: 데이터 없음")

    rows = list(csv.DictReader(io.StringIO(body)))
    dates, vals = [], []
    for r in rows:
        c = (r.get("Close") or "").strip()
        d = (r.get("Date") or "").strip()
        if not c or c in ("N/A", "-") or not d:
            continue
        try:
            vals.append(float(c))
            dates.append(d)
        except ValueError:
            continue
    if len(vals) < 30:
        raise ValueError(f"stooq: 데이터 부족 ({len(vals)}건)")
    return dates, vals


def from_naver(code):
    end = datetime.now(KST)
    start = end - timedelta(days=800)
    url = ("https://api.finance.naver.com/siseJson.naver?symbol=" + code +
           "&requestType=1&startTime=" + start.strftime("%Y%m%d") +
           "&endTime=" + end.strftime("%Y%m%d") + "&timeframe=day")
    body = fetch(url).strip()
    # 응답이 작은따옴표 기반이라 JSON으로 바꿔 읽습니다
    arr = json.loads(body.replace("'", '"'))
    dates, vals = [], []
    for row in arr[1:]:
        if len(row) < 5:
            continue
        try:
            d = str(row[0])
            c = float(row[4])
        except (ValueError, TypeError):
            continue
        dates.append(f"{d[0:4]}-{d[4:6]}-{d[6:8]}")
        vals.append(c)
    if len(vals) < 30:
        raise ValueError(f"naver: 데이터 부족 ({len(vals)}건)")
    return dates, vals


def from_yahoo(code):
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/" +
           urllib.parse.quote(code) + "?range=2y&interval=1d")
    raw = fetch(url, expect_json=True)
    res = raw["chart"]["result"][0]
    ts = res["timestamp"]
    closes = res["indicators"]["quote"][0]["close"]
    rows = [(t, c) for t, c in zip(ts, closes) if c is not None]
    if len(rows) < 30:
        raise ValueError(f"yahoo: 데이터 부족 ({len(rows)}건)")
    dates = [datetime.fromtimestamp(t, tz=timezone.utc).strftime("%Y-%m-%d") for t, _ in rows]
    return dates, [float(c) for _, c in rows]


LOADERS = {"stooq": from_stooq, "naver": from_naver, "yahoo": from_yahoo}


# ---------- 지표 ----------

def sma(vals, n):
    return sum(vals[-n:]) / n if len(vals) >= n else None


def rsi(vals, n=14):
    if len(vals) < n + 1:
        return None
    gains = [max(vals[i] - vals[i - 1], 0.0) for i in range(1, n + 1)]
    losses = [max(vals[i - 1] - vals[i], 0.0) for i in range(1, n + 1)]
    ag, al = sum(gains) / n, sum(losses) / n
    for i in range(n + 1, len(vals)):
        d = vals[i] - vals[i - 1]
        ag = (ag * (n - 1) + max(d, 0.0)) / n
        al = (al * (n - 1) + max(-d, 0.0)) / n
    if al == 0:
        return 100.0
    return 100.0 - (100.0 / (1.0 + ag / al))


def pct(a, b):
    return None if not b else (a / b - 1.0) * 100.0


def analyze(entry):
    """소스를 순서대로 시도해서 첫 성공을 쓴다."""
    errs = []
    for src_name, code in entry["src"]:
        try:
            dates, vals = LOADERS[src_name](code)
        except Exception as e:  # noqa: BLE001
            errs.append(f"{src_name}: {str(e)[:80]}")
            continue

        price, prev = vals[-1], (vals[-2] if len(vals) > 1 else vals[-1])
        window = vals[-252:] if len(vals) >= 252 else vals
        high52, low52 = max(window), min(window)
        ma200, ma20 = sma(vals, 200), sma(vals, 20)

        out = {
            "symbol": entry["sym"], "name": entry["name"], "kind": entry["kind"],
            "source": src_name,
            "price": round(price, 4), "prev_close": round(prev, 4),
            "day_pct": round(pct(price, prev), 2) if prev else None,
            "last_trade_date": dates[-1],
            "high52": round(high52, 4), "low52": round(low52, 4),
            "drawdown_pct": round(pct(price, high52), 2),
            "ma20": round(ma20, 4) if ma20 else None,
            "ma200": round(ma200, 4) if ma200 else None,
            "ma200_gap_pct": round(pct(price, ma200), 2) if ma200 else None,
            "rsi14": round(rsi(vals), 1) if rsi(vals) is not None else None,
            "spark": [round(v, 4) for v in vals[-60:]],
        }
        if len(vals) > 60:
            out["chg60_pct"] = round(pct(price, vals[-61]), 2)
        if entry["kind"] == "position":
            out["bucket"], out["ccy"] = entry["bucket"], entry["ccy"]
        else:
            out["unit"] = entry.get("unit", "")
        return out, src_name

    raise RuntimeError(" | ".join(errs))


# ---------- 트랜치 ----------

def load_tranches():
    if os.path.exists(TRANCHE_PATH):
        try:
            with open(TRANCHE_PATH, encoding="utf-8") as f:
                return json.load(f)
        except Exception:  # noqa: BLE001
            pass
    return {"fired": {}, "history": []}


def update_tranches(state, quotes, today):
    newly = []
    for q in quotes:
        if q.get("kind") != "position":
            continue
        sym = q["symbol"]
        st = state["fired"].setdefault(sym, {"high52": q["high52"], "levels": []})
        if q["high52"] > st.get("high52", 0) * 1.0001:
            st["high52"] = q["high52"]
            if st["levels"]:
                state["history"].append({"date": today, "symbol": sym, "event": "reset",
                                         "note": "52주 고점 갱신으로 계단 초기화"})
            st["levels"] = []
        for lv in TRANCHE_LEVELS:
            if q["drawdown_pct"] <= lv and lv not in st["levels"]:
                st["levels"].append(lv)
                rec = {"date": today, "symbol": sym, "name": q["name"], "event": "tranche",
                       "level": lv, "price": q["price"], "drawdown": q["drawdown_pct"]}
                state["history"].append(rec)
                newly.append(rec)
        st["levels"].sort(reverse=True)
    state["history"] = state["history"][-200:]
    return newly


# ---------- 메인 ----------

def main():
    now = datetime.now(KST)
    quotes, errors, used = [], [], {}

    for entry in SYMBOLS:
        try:
            q, src = analyze(entry)
            quotes.append(q)
            used[entry["sym"]] = src
            print(f"  ok   {entry['sym']:<12} ({src})  {q['price']}")
        except Exception as e:  # noqa: BLE001
            errors.append({"symbol": entry["sym"], "error": str(e)[:300]})
            print(f"  FAIL {entry['sym']}: {e}", file=sys.stderr)
        time.sleep(0.6)   # 소스에 대한 예의

    if not quotes:
        print("전부 실패 — 기존 data.json을 유지합니다.", file=sys.stderr)
        return 1

    state = load_tranches()
    newly = update_tranches(state, quotes, now.strftime("%Y-%m-%d"))

    payload = {
        "generated_at": now.isoformat(timespec="seconds"),
        "generated_at_label": now.strftime("%Y-%m-%d %H:%M KST"),
        "sector_ceiling": SECTOR_CEILING,
        "tranche_levels": TRANCHE_LEVELS,
        "sources": used,
        "quotes": {q["symbol"]: q for q in quotes},
        "tranches": state["fired"],
        "tranche_history": list(reversed(state["history"]))[:40],
        "fired_today": newly,
        "errors": errors,
    }
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
    with open(TRANCHE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=1)

    print(f"완료 — 성공 {len(quotes)}건 / 실패 {len(errors)}건 / 신규 트랜치 {len(newly)}건")
    return 0


if __name__ == "__main__":
    sys.exit(main())
