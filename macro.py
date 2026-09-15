# -*- coding: utf-8 -*-
"""
Gate — macro 수집기
collect.py 는 건드리지 않습니다. 이 스크립트가 macro.json 을 따로 만듭니다.

실행: python macro.py
필요 환경변수: FRED_API_KEY (필수), ECOS_API_KEY (선택)
의존성: requests (yfinance 는 있으면 쓰고 없으면 건너뜀)

설계 원칙
  1층 = 판정을 바꾸는 지표. 매일 자동. 5~8개로 제한.
  2층 = 인과 사슬. 문장은 고정, 값과 판정만 매일 바뀜.
  3층 = 분기 맥락. macro-context.js 에서 수동 관리. 여기서 안 다룸.
"""

import os, json, time, datetime, urllib.parse
import requests

FRED_KEY = os.environ.get("FRED_API_KEY", "").strip()
ECOS_KEY = os.environ.get("ECOS_API_KEY", "").strip()

OUT = "macro.json"
ERRORS = []


def safe(msg, limit=140):
    """오류 문자열에서 API 키를 지웁니다.
    ECOS 는 키를 URL 경로에 넣기 때문에 예외 메시지에 그대로 실립니다.
    macro.json 은 공개 저장소에 커밋되므로 반드시 가려야 합니다."""
    t = str(msg)
    for k in (ECOS_KEY, FRED_KEY):
        if k:
            t = t.replace(k, "***")
    return t[:limit]


# ---------------------------------------------------------------- FRED

def fred(series_id, years=5):
    """FRED 시계열 → [(date, value)] 오름차순. 결측('.')은 제외."""
    if not FRED_KEY:
        raise RuntimeError("FRED_API_KEY 없음")
    start = (datetime.date.today() - datetime.timedelta(days=365 * years)).isoformat()
    url = "https://api.stlouisfed.org/fred/series/observations?" + urllib.parse.urlencode({
        "series_id": series_id,
        "api_key": FRED_KEY,
        "file_type": "json",
        "observation_start": start,
        "sort_order": "asc",
    })
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    out = []
    for o in r.json().get("observations", []):
        v = o.get("value")
        if v in (".", "", None):
            continue
        try:
            out.append((o["date"], float(v)))
        except ValueError:
            pass
    if not out:
        raise RuntimeError("관측치 없음")
    return out


def stat(series_id, label, unit="%", years=5, invert_pctile=False):
    """레벨 + 20/60영업일 변화 + 5년 백분위."""
    try:
        s = fred(series_id, years)
    except Exception as e:
        ERRORS.append({"src": series_id, "error": safe(e)})
        return None

    vals = [v for _, v in s]
    last_d, last = s[-1]

    def chg(n):
        return round(last - vals[-1 - n], 3) if len(vals) > n else None

    below = sum(1 for v in vals if v <= last)
    pct = round(below / len(vals) * 100, 1)
    if invert_pctile:
        pct = round(100 - pct, 1)

    return {
        "id": series_id, "label": label, "unit": unit,
        "value": round(last, 3), "asof": last_d,
        "chg_20d": chg(20), "chg_60d": chg(60),
        "pctile_5y": pct,
        "min_1y": round(min(vals[-252:]), 3) if len(vals) >= 30 else None,
        "max_1y": round(max(vals[-252:]), 3) if len(vals) >= 30 else None,
    }


# ---------------------------------------------------------------- ECOS

def ecos(stat_code, item_code, cycle="D", n=400):
    """
    한국은행 ECOS. 통계표 코드는 기관이 개편하면 바뀝니다.
    실패해도 전체가 죽지 않게 예외를 삼키고 ERRORS 에만 남깁니다.
    코드 확인: https://ecos.bok.or.kr/api/#/DevGuide/StatisticalCodeSearch
    """
    if not ECOS_KEY:
        return None
    today = datetime.date.today()
    if cycle == "D":
        start = (today - datetime.timedelta(days=n)).strftime("%Y%m%d")
        end = today.strftime("%Y%m%d")
    else:
        start = (today - datetime.timedelta(days=n)).strftime("%Y%m")
        end = today.strftime("%Y%m")

    url = "/".join([
        "https://ecos.bok.or.kr/api/StatisticSearch",
        ECOS_KEY, "json", "kr", "1", "700",
        stat_code, cycle, start, end, item_code,
    ])
    last = None
    for attempt in range(3):          # 해외 IP에서 간헐적으로 연결이 끊깁니다
        try:
            r = requests.get(url, timeout=20)
            r.raise_for_status()
            j = r.json()
            break
        except Exception as e:
            last = e
            if attempt < 2:
                time.sleep(3)
    else:
        ERRORS.append({"src": "ECOS " + stat_code, "error": safe(last)})
        return None

    try:
        rows = j.get("StatisticSearch", {}).get("row", [])
        out = []
        for row in rows:
            try:
                out.append((row["TIME"], float(row["DATA_VALUE"])))
            except (KeyError, ValueError, TypeError):
                pass
        if not out:
            ERRORS.append({"src": "ECOS " + stat_code, "error": safe(j)})
            return None
        return out
    except Exception as e:
        ERRORS.append({"src": "ECOS " + stat_code, "error": safe(e)})
        return None


# ---------------------------------------------------------------- 1층

def layer1():
    ind = {}
    # 미국 커브
    ind["ust2"]  = stat("DGS2",  "미국채 2년")
    ind["ust5"]  = stat("DGS5",  "미국채 5년")
    ind["ust10"] = stat("DGS10", "미국채 10년")
    ind["ust30"] = stat("DGS30", "미국채 30년")
    # 할인율의 본체
    ind["real10"] = stat("DFII10", "미 10년 실질금리")
    ind["be10"]   = stat("T10YIE", "10년 기대인플레")
    # 이 포트폴리오의 진짜 선행지표
    ind["ig"] = stat("BAMLC0A0CM", "투자등급 회사채 스프레드")
    # 통화
    ind["dxy"]  = stat("DTWEXBGS", "달러인덱스(광의)", unit="")
    ind["usdkrw"] = stat("DEXKOUS", "원/달러", unit="원")

    return {k: v for k, v in ind.items() if v}


# ---------------------------------------------------------------- 2층

def verdict_curve(i):
    """커브 모양 — 60일 변화폭 비교로 플래트닝/스티프닝 판정."""
    a, b, c = i.get("ust5"), i.get("ust10"), i.get("ust30")
    if not (a and b and c) or None in (a["chg_60d"], b["chg_60d"], c["chg_60d"]):
        return None, "커브 데이터 부족"
    s5, s10, s30 = a["chg_60d"], b["chg_60d"], c["chg_60d"]
    sp_10_5 = round(b["value"] - a["value"], 3)
    sp_30_10 = round(c["value"] - b["value"], 3)

    if s5 > s30 + 0.10:
        tag = "베어 플래트닝"
        txt = ("짧은 쪽이 긴 쪽보다 빠르게 올랐습니다(60일 5년 %+.2f%%p vs 30년 %+.2f%%p). "
               "재정·국채발행 우려였다면 30년이 앞장서야 합니다. 반대로 나왔다는 건 "
               "시장이 정책금리 인상 자체를 반영하면서도 장기 인플레는 통제된다고 본다는 뜻입니다.") % (s5, s30)
    elif s30 > s5 + 0.10:
        tag = "베어 스티프닝"
        txt = ("긴 쪽이 앞장섰습니다(60일 30년 %+.2f%%p vs 5년 %+.2f%%p). "
               "정책금리보다 재정적자·국채공급·인플레 신뢰 쪽 문제입니다. "
               "이 경우 주식 밸류에이션 압박이 더 오래갑니다.") % (s30, s5)
    else:
        tag = "평행 이동"
        txt = "커브 전 구간이 비슷하게 움직였습니다. 특정 구간의 이야기가 아니라 레벨 전체의 재평가입니다."
    return tag, txt + " (10년−5년 %.3f%%p, 30년−10년 %.3f%%p)" % (sp_10_5, sp_30_10)


def verdict_ig(i):
    """조달여건 — 캐펙스 경로의 중간 고리."""
    ig = i.get("ig")
    if not ig:
        return None, "IG 스프레드 수집 실패"
    d60 = ig["chg_60d"]
    lvl = ig["value"]
    if d60 is None:
        return None, "변화폭 계산 불가"
    if d60 >= 0.25:
        tag = "확대 — 경고"
        txt = ("60일간 %+.2f%%p 확대. 금리 상승이 조달여건 악화로 번지는 국면입니다. "
               "전력기기 3종목의 수주 파이프라인을 떠받치는 데이터센터 캐펙스가 실제로 둔화될 수 있는 "
               "유일한 경로가 이것입니다. 반증 조건에 근접.") % d60
    elif d60 >= 0.10:
        tag = "소폭 확대 — 관찰"
        txt = ("60일간 %+.2f%%p. 아직 경고는 아니지만 방향이 나쁩니다. "
               "국채금리 상승과 같이 움직이는지 확인 필요.") % d60
    else:
        tag = "안정"
        txt = ("60일간 %+.2f%%p. 국채금리가 올라도 신용 스프레드는 벌어지지 않았습니다. "
               "금리 상승의 이유가 경기 호조라는 해석과 부합하고, 캐펙스 스토리는 아직 살아 있습니다. "
               "금리가 캐펙스를 죽이는 게 아니라 스프레드가 죽입니다.") % d60
    txt += " 현재 %.2f%%p, 5년 백분위 %s%%." % (lvl, ig["pctile_5y"])
    return tag, txt


def verdict_fx(i, kr_base):
    """정책 → 달러 → 원화 → 원화환산 수익률."""
    dxy, krw, r10 = i.get("dxy"), i.get("usdkrw"), i.get("real10")
    if not (dxy and krw):
        return None, "통화 데이터 부족"
    d_dxy = dxy["chg_20d"]
    d_krw = krw["chg_20d"]
    parts = []
    if r10:
        parts.append("미 10년 실질금리 %.2f%% (5년 백분위 %s%%)" % (r10["value"], r10["pctile_5y"]))
    parts.append("달러인덱스 20일 %+.2f" % (d_dxy or 0))
    parts.append("원/달러 %.1f원, 20일 %+.1f원" % (krw["value"], d_krw or 0))
    if kr_base is not None:
        parts.append("한은 기준금리 %.2f%%" % kr_base)

    if d_krw is not None and d_krw < -10:
        tag = "원화 강세 — 원화환산 수익률에 역풍"
        txt = ("미 금리가 오르는데 원화가 강해지는 구간입니다. 교과서와 반대이고, "
               "국내 수급(경상흑자·외국인 유입) 쪽 요인이 금리차를 이기고 있다는 뜻입니다. "
               "달러 자산을 사기엔 유리하지만, 이미 들고 있는 해외주식의 원화환산 수익률은 깎입니다. "
               "QQQ 원화 수익률이 달러 기준보다 나빠 보이는 이유가 여기 있습니다.")
    elif d_krw is not None and d_krw > 10:
        tag = "원화 약세 — 원화환산 수익률에 순풍"
        txt = ("금리차가 환율에 그대로 반영되는 국면입니다. 보유 해외자산의 원화 평가액이 "
               "주가와 무관하게 올라갑니다. 반대로 신규 달러 매수 단가는 나빠집니다.")
    else:
        tag = "중립"
        txt = "환율이 좁은 범위에 있습니다. 통화 선택이 수익률을 좌우하는 국면은 아닙니다."
    return tag, txt + " — " + " · ".join(parts)


def layer2(i):
    kr_base = None
    kb = ecos("722Y001", "0101000", "D")   # 한국은행 기준금리(일별)
    if kb:
        kr_base = kb[-1][1]

    chains = []
    t, x = verdict_curve(i)
    chains.append({
        "id": "curve",
        "title": "커브 모양이 말하는 것",
        "path": "연준 정책 기대 → 커브 구간별 반응",
        "verdict": t, "text": x,
    })
    t, x = verdict_ig(i)
    chains.append({
        "id": "capex",
        "title": "금리 → 조달비용 → AI 캐펙스 → 전력기기",
        "path": "실질금리 ↑ → IG 회사채 스프레드 → 하이퍼스케일러 조달 → 데이터센터 발주",
        "verdict": t, "text": x,
    })
    t, x = verdict_fx(i, kr_base)
    chains.append({
        "id": "fx",
        "title": "연준 → 달러 → 원화 → 내 원화환산 수익률",
        "path": "미 실질금리 → 달러인덱스 → 원/달러 → 보유 해외자산 평가액",
        "verdict": t, "text": x,
    })
    return chains


# ---------------------------------------------------------------- main

def main():
    i = layer1()
    doc = {
        "generated_at": datetime.datetime.now(
            datetime.timezone(datetime.timedelta(hours=9))).isoformat(timespec="seconds"),
        "indicators": i,
        "chains": layer2(i),
        "errors": ERRORS,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    print("wrote %s — 지표 %d개, 사슬 %d개, 오류 %d건"
          % (OUT, len(i), len(doc["chains"]), len(ERRORS)))
    for e in ERRORS:
        print("  ! %s: %s" % (e["src"], e["error"]))


if __name__ == "__main__":
    main()
