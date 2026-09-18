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


# ---------------------------------------------------------------- Yahoo

def from_data_json(symbol, label):
    """collect.py 가 이미 받아둔 값을 재사용합니다.
    야후를 두 번 때리지 않고, 차단·한도 문제도 피합니다."""
    try:
        with open("data.json", encoding="utf-8") as f:
            q = (json.load(f).get("quotes") or {}).get(symbol)
        if not q or q.get("price") is None:
            return None
        sp = q.get("spark") or []
        last = float(q["price"])

        def pct(n):
            if len(sp) > n and sp[-1 - n]:
                return round((last / sp[-1 - n] - 1) * 100, 2)
            return None

        out = {
            "id": symbol, "label": label, "unit": "",
            "value": round(last, 2), "asof": "data.json",
            "chg_20d": pct(20),
            "chg_60d": pct(60) if len(sp) > 60 else q.get("chg60_pct"),
            "pctile_5y": None, "is_pct": True,
            "min_1y": q.get("low52"), "max_1y": q.get("high52"),
        }
        if out["chg_20d"] is None and q.get("ma20"):
            out["chg_20d"] = round((last / q["ma20"] - 1) * 100, 2)   # 근사 — 20일선 대비
        return out
    except Exception:
        return None


def yahoo(symbol, label, years=5):
    """야후 차트 API에서 일간 종가를 받아 stat() 과 같은 모양으로 돌려줍니다.
    변화폭은 지수라서 포인트가 아니라 퍼센트로 담습니다."""
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/"
           + urllib.parse.quote(symbol)
           + "?range=" + str(years) + "y&interval=1d")
    try:
        r = requests.get(url, timeout=20,
                         headers={"User-Agent": "Mozilla/5.0 (gate-bot)"})
        r.raise_for_status()
        res = r.json()["chart"]["result"][0]
        ts = res["timestamp"]
        cl = res["indicators"]["quote"][0]["close"]
    except Exception as e:
        ERRORS.append({"src": symbol, "error": safe(e)})
        return None

    pts = [(t, c) for t, c in zip(ts, cl) if c is not None]
    if len(pts) < 70:
        ERRORS.append({"src": symbol, "error": "관측치 부족"})
        return None

    vals = [c for _, c in pts]
    last = vals[-1]

    def pct(n):
        if len(vals) <= n or not vals[-1 - n]:
            return None
        return round((last / vals[-1 - n] - 1) * 100, 2)

    below = sum(1 for v in vals if v <= last)
    return {
        "id": symbol, "label": label, "unit": "",
        "value": round(last, 2),
        "asof": datetime.datetime.utcfromtimestamp(pts[-1][0]).strftime("%Y-%m-%d"),
        "chg_20d": pct(20), "chg_60d": pct(60),
        "pctile_5y": round(below / len(vals) * 100, 1),
        "min_1y": round(min(vals[-252:]), 2),
        "max_1y": round(max(vals[-252:]), 2),
        "is_pct": True,
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
    # 정책금리 — FOMC 결정 당일 갱신됩니다. 국채금리와 달리 지연이 거의 없습니다.
    ind["ffr"] = stat("DFEDTARU", "미 정책금리 상단")
    ind["real10"] = stat("DFII10", "미 10년 실질금리")
    ind["be10"]   = stat("T10YIE", "10년 기대인플레")
    # 이 포트폴리오의 진짜 선행지표
    ind["ig"] = stat("BAMLC0A0CM", "투자등급 회사채 스프레드")
    # 하이일드 — 투자등급보다 먼저 벌어집니다. 조기 경보용.
    ind["hy"] = stat("BAMLH0A0HYM2", "하이일드 스프레드")
    # 유가 — 물가 경로이자 전력기기 원가
    ind["wti"] = stat("DCOILWTICO", "WTI 유가", unit="$")
    # 통화
    ind["dxy"]  = stat("DTWEXBGS", "달러인덱스(광의)", unit="")
    ind["usdkrw"] = stat("DEXKOUS", "원/달러", unit="원")
    # 일본 — 캐리 청산의 실시간 신호
    ind["jpy"] = stat("DEXJPUS", "엔/달러", unit="엔")
    # collect.py 가 ^N225 를 이미 받았으면 그걸 쓰고, 없으면 직접 받습니다
    ind["n225"] = from_data_json("^N225", "닛케이225") or yahoo("^N225", "닛케이225")
    # 구리 — 전력기기 원가의 본체. collect.py 가 HG=F 를 받으면 그걸 씁니다.
    ind["copper"] = from_data_json("HG=F", "구리") or yahoo("HG=F", "구리")

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
    """조달여건 — 캐펙스 경로의 중간 고리.
    투자등급은 가장 늦게 벌어지므로 하이일드를 조기 경보로 함께 봅니다."""
    ig, hy = i.get("ig"), i.get("hy")
    if not ig:
        return None, "IG 스프레드 수집 실패"
    d60 = ig["chg_60d"]
    if d60 is None:
        return None, "변화폭 계산 불가"
    h60 = hy["chg_60d"] if hy else None

    if h60 is not None and h60 >= 0.75 and d60 < 0.25:
        tag = "조기 경보 — 하이일드 선행"
        txt = ("투자등급은 아직 조용한데 하이일드가 60일간 %+.2f%%p 벌어졌습니다. "
               "신용 균열은 약한 곳에서 먼저 시작되고 투자등급은 가장 늦게 반응합니다. "
               "2007년에도 하이일드가 먼저 움직였습니다. 지금이 그 순서의 첫 단계일 수 있습니다.") % h60
    elif d60 >= 0.25:
        tag = "확대 — 경고"
        txt = ("투자등급 스프레드가 60일간 %+.2f%%p 확대. 금리 상승이 조달여건 악화로 번지는 국면입니다. "
               "전력기기 3종목의 수주 파이프라인을 떠받치는 데이터센터 캐펙스가 실제로 둔화될 수 있는 "
               "유일한 경로입니다. 반증 조건에 근접.") % d60
    elif d60 >= 0.10 or (h60 is not None and h60 >= 0.35):
        tag = "소폭 확대 — 관찰"
        txt = ("투자등급 %+.2f%%p" % d60)
        if h60 is not None:
            txt += ", 하이일드 %+.2f%%p" % h60
        txt += ". 아직 경고는 아니지만 방향이 나쁩니다. 국채금리 상승과 같이 움직이는지 확인 필요."
    else:
        tag = "안정"
        txt = ("투자등급 60일 %+.2f%%p" % d60)
        if h60 is not None:
            txt += ", 하이일드 %+.2f%%p" % h60
        txt += (". 국채금리가 올라도 신용 스프레드는 벌어지지 않았습니다. "
                "금리 상승의 이유가 경기 호조라는 해석과 부합하고, 캐펙스 스토리는 아직 살아 있습니다. "
                "금리가 캐펙스를 죽이는 게 아니라 스프레드가 죽입니다.")

    txt += " 현재 투자등급 %.2f%%p (5년 백분위 %s%%)" % (ig["value"], ig["pctile_5y"])
    if hy:
        txt += " · 하이일드 %.2f%%p (5년 백분위 %s%%)" % (hy["value"], hy["pctile_5y"])

    cu = i.get("copper")
    if cu and cu.get("chg_60d") is not None:
        txt += (" · 구리 60일 %+.1f%% — 전력기기 원가의 본체입니다. "
                "마진이 깎일 때 증설 투자 탓인지 원자재 탓인지는 이 숫자로 갈립니다.") % cu["chg_60d"]
    return tag, txt


def verdict_fx(i, kr_base, kr=None):
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
        parts.append("한국 콜금리 %.2f%%" % kr_base)
    kr10 = (kr or {}).get("kr10")
    us10 = i.get("ust10")
    if kr10 and us10:
        parts.append("한미 10년 금리차 %.2f%%p (한국 %.2f%%, %s 기준)"
                     % (us10["value"] - kr10["value"], kr10["value"], kr10["asof"]))

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


def jgb10():
    """일본 10년 국채 (OECD 장기금리, 월간). 일간 무료 소스가 없어 월간을 씁니다."""
    try:
        s = fred("IRLTLT01JPM156N", 5)
    except Exception as e:
        ERRORS.append({"src": "IRLTLT01JPM156N", "error": safe(e)})
        return None
    vals = [v for _, v in s]
    return {"value": vals[-1], "asof": s[-1][0],
            "chg_3m": round(vals[-1] - vals[-4], 3) if len(vals) > 3 else None}


def verdict_japan(i, jgb):
    """일본 정상화 → 캐리 청산 → 내 자산. 성준님은 일본 자산이 없으므로
    일본 자체가 아니라 미 금리·원화로 전달되는 경로만 판정합니다."""
    jpy, us10 = i.get("jpy"), i.get("ust10")
    if not jpy:
        return None, "엔/달러 수집 실패"

    prev = jpy["value"] - (jpy["chg_20d"] or 0)
    jpy_pct = (jpy["value"] - prev) / prev * 100 if prev else 0   # 음수 = 엔 강세

    parts = ["엔/달러 %.1f엔, 20일 %+.1f%%" % (jpy["value"], jpy_pct)]
    gap = None
    if jgb and us10:
        gap = round(us10["value"] - jgb["value"], 2)
        parts.append("미일 10년 금리차 %.2f%%p (일본 %.2f%%, %s 기준)" % (gap, jgb["value"], jgb["asof"]))
        if jgb["chg_3m"] is not None:
            parts.append("일본 10년 3개월 %+.2f%%p" % jgb["chg_3m"])

    nk = i.get("n225")
    nk20 = nk["chg_20d"] if nk else None
    if nk20 is not None:
        parts.append("닛케이225 %.0f, 20일 %+.1f%%" % (nk["value"], nk20))

    if jpy_pct <= -3 and nk20 is not None and nk20 <= -5:
        tag = "청산 진행 — 경고"
        txt = ("엔화 20일 %.1f%% 절상 + 닛케이 %.1f%%. 두 개가 같이 움직이면 청산입니다. "
               "2024년 8월에도 엔 급등과 닛케이 급락이 동시에 나왔습니다. "
               "빌린 엔을 갚느라 전 세계 위험자산이 함께 팔리는 국면이고, "
               "이때 QQQ 하락은 금리 탓도 경기 탓도 아닌 '유동성 청산' 탓이라 회복이 가장 빠릅니다 — 적립 지속이 맞습니다. "
               "다만 원/달러는 반대로 오르므로 신규 달러 매수는 불리해집니다.") % (abs(jpy_pct), nk20)
    elif jpy_pct <= -3:
        tag = "엔 강세 — 관찰"
        txt = ("엔화가 20일 만에 %.1f%% 절상됐는데 닛케이는 버티고 있습니다. "
               "청산이라면 둘이 같이 움직입니다. 지금은 금리차 축소나 안전자산 선호 같은 "
               "다른 이유일 가능성이 큽니다. 닛케이가 따라 빠지는지가 갈림길입니다.") % abs(jpy_pct)
    elif gap is not None and gap <= 1.5:
        tag = "캐리 유인 축소 — 관찰"
        txt = ("미일 금리차가 %.2f%%p까지 좁혀졌습니다. 엔을 빌려 달러 자산을 사는 이득이 줄어드는 만큼 "
               "청산 압력이 쌓입니다. 아직 엔화는 조용하지만 재료는 모이는 중입니다.") % gap
    else:
        tag = "안정"
        txt = ("엔화가 급격히 움직이지 않고 있습니다. 일본은행이 올려도 미일 금리차가 충분히 크면 "
               "캐리는 유지됩니다. 지난 두 차례 인상에서도 우려하던 대규모 청산은 나타나지 않았습니다.")

    return tag, txt + " — " + " · ".join(parts)


def kr_rates():
    """한국 금리는 FRED(OECD 취합)에서 받습니다.
    ECOS 는 해외 IP에서 연결이 자주 끊겨 GitHub Actions 에서는 쓰지 않습니다.
    월간이지만 기준금리·국고채 10년은 월간이면 충분합니다."""
    out = {}
    for key, sid, label in (
        ("policy", "IRSTCI01KRM156N", "한국 콜금리"),
        ("kr10", "IRLTLT01KRM156N", "한국 국고채 10년"),
    ):
        try:
            ser = fred(sid, 5)
            vals = [v for _, v in ser]
            out[key] = {"label": label, "value": vals[-1], "asof": ser[-1][0],
                        "chg_3m": round(vals[-1] - vals[-4], 3) if len(vals) > 3 else None}
        except Exception as e:
            ERRORS.append({"src": sid, "error": safe(e)})
    return out


def verdict_policy(i, kr):
    """연준이 실제로 무엇을 했는가. 예상이 아니라 확정된 사실만 봅니다."""
    f = i.get("ffr")
    if not f:
        return None, "정책금리 수집 실패"

    d20, d60 = f.get("chg_20d"), f.get("chg_60d")
    parts = ["미 정책금리 상단 %.2f%% (%s 기준)" % (f["value"], f["asof"])]

    krp = (kr or {}).get("policy")
    gap = None
    if krp:
        gap = round(f["value"] - krp["value"], 2)
        parts.append("한국 콜금리 %.2f%% → 한미 금리차 %.2f%%p" % (krp["value"], gap))

    if d20 and d20 > 0:
        tag = "인상 확정"
        txt = ("최근 20일 안에 %+.2f%%p 올랐습니다. 예상이 아니라 실행된 사실입니다. "
               "인상 자체는 대개 미리 반영되므로 이제부터는 '다음 회의까지의 경로'가 값을 움직입니다.") % d20
        if gap is not None:
            txt += (" 한미 금리차가 %.2f%%p로 벌어졌습니다 — 그동안 통하지 않던 금리차 논리가 "
                    "환율에 복원되는지가 다음 확인 지점입니다.") % gap
    elif d20 and d20 < 0:
        tag = "인하 확정"
        txt = ("최근 20일 안에 %.2f%%p 내렸습니다. 장기 성장주의 할인율이 낮아지는 방향이라 "
               "코어에는 순풍입니다.") % d20
    elif d60 and d60 > 0:
        tag = "인상 사이클 진행"
        txt = ("60일 기준 %+.2f%%p. 최근 20일은 변동이 없지만 사이클 방향은 인상입니다.") % d60
    else:
        tag = "동결"
        txt = "정책금리에 변화가 없습니다. 지금 움직이는 건 정책이 아니라 시장 금리입니다."

    return tag, txt + " — " + " · ".join(parts)


def verdict_oil(i):
    """유가 — 물가·연준 경로와 전력기기 원가로 동시에 들어옵니다."""
    w = i.get("wti")
    if not w:
        return None, "유가 수집 실패"
    v, d60 = w["value"], w["chg_60d"]
    parts = ["WTI %.2f달러 (5년 백분위 %s%%)" % (v, w["pctile_5y"])]
    if d60 is not None:
        parts.append("60일 %+.2f달러" % d60)
    be = i.get("be10")
    if be:
        parts.append("10년 기대인플레 %.2f%%" % be["value"])

    pct60 = None
    if d60 is not None and (v - d60):
        pct60 = d60 / (v - d60) * 100

    if v >= 110 or (pct60 is not None and pct60 >= 30):
        tag = "경고"
        txt = ("유가가 물가 경로를 직접 밀어올리는 구간입니다. 연준의 추가 인상 논거가 굳어지고, "
               "동시에 구리·물류비를 통해 전력기기 원가도 압박합니다. 고정가 계약이 많은 구조에서는 "
               "원가 상승이 곧바로 마진 하락입니다. 2008년에는 유가가 147달러에서 정점을 찍은 직후 "
               "수요 파괴로 35달러까지 무너졌습니다 — 급등의 끝이 급락인 경우가 많습니다.")
    elif v >= 90:
        tag = "관찰"
        txt = ("유가가 높은 구간에 있지만 아직 물가 전이가 확인되지는 않았습니다. "
               "헤드라인 물가에는 바로 들어가고 근원 물가에는 몇 달 걸립니다. "
               "근원까지 번지면 연준 경로가 바뀝니다. 다음 소비자물가 발표가 확인 지점입니다.")
    else:
        tag = "중립"
        txt = ("유가가 물가를 밀어올릴 수준이 아닙니다. 전력기기 원가에도 부담이 적습니다.")

    return tag, txt + " — " + " · ".join(parts)


def layer2(i):
    kr = kr_rates()
    kr_base = kr.get("policy", {}).get("value")

    chains = []
    t, x = verdict_policy(i, kr)
    chains.append({
        "id": "policy",
        "title": "연준이 실제로 한 일",
        "path": "FOMC 결정 → 정책금리 → 한미 금리차 → 환율",
        "verdict": t, "text": x,
    })
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
    t, x = verdict_oil(i)
    chains.append({
        "id": "oil",
        "title": "유가 → 물가 → 연준 / 원가",
        "path": "유가 ↑ → 헤드라인 물가 → 근원 물가 → 추가 인상 / 구리·물류비 → 전력기기 마진 / 한국 무역수지 → 원달러",
        "verdict": t, "text": x,
    })
    t, x = verdict_japan(i, jgb10())
    chains.append({
        "id": "japan",
        "title": "일본 정상화 → 캐리 청산 → 내 자산",
        "path": "일본 금리 ↑ → 미 국채 본국 회귀 → 미 장기금리 ↑ / 엔 급등 → 위험자산 청산 → 원화 약세",
        "verdict": t, "text": x,
    })
    t, x = verdict_fx(i, kr_base, kr)
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
