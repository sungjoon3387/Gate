# -*- coding: utf-8 -*-
"""
Gate — 반증 조건 감시기

논거 카드의 반증 조건 중 '공시로는 안 잡히고 뉴스로만 확인되는 것'만 감시합니다.
매일 헤드라인을 뿌리는 도구가 아닙니다. 걸리는 날에만 watch.json 에 alerts 가 찹니다.

출력: watch.json
필요 환경변수: 없음 (구글 뉴스 RSS·SEC EDGAR 모두 키 불필요)
의존성: requests
"""

import json, re, datetime, urllib.parse, xml.etree.ElementTree as ET
import requests

OUT = "watch.json"
ERRORS = []
UA = {"User-Agent": "gate-bot (personal portfolio monitor)"}

NEWS_DAYS = 7      # 이 기간 안의 기사만
FILING_DAYS = 14   # 이 기간 안의 공시만
PER_RULE = 3       # 규칙당 최대 기사 수


# 반증 조건 ↔ 검색어 ↔ 제목 필수어
# must 는 제목에 하나라도 있어야 통과합니다. 없으면 노이즈로 버립니다.
RULES = [
    {
        "id": "trade-stop",
        "syms": ["ETN", "GEV"],
        "rule": "미국의 무역 중단·추가 관세 발효 → 데이터센터 건설 비용 상승, 발주 지연",
        "q": "트럼프 무역 중단 관세 발효",
        "must": ["무역", "관세"],
    },
    {
        "id": "dc-capex",
        "syms": ["ETN", "GEV"],
        "rule": "하이퍼스케일러가 데이터센터 투자 축소·연기를 공식화",
        "q": "데이터센터 투자 축소 연기 하이퍼스케일러",
        "must": ["데이터센터", "캐펙스", "투자"],
    },
    {
        "id": "fed-independence",
        "syms": ["QQQ", "ETN", "GEV"],
        "rule": "연준 독립성 훼손이 장기금리 상승으로 전이 (커브 스티프닝은 Gate가 자동 판정)",
        "q": "연준 독립성 트럼프 압박 장기금리",
        "must": ["연준", "금리"],
    },
    {
        "id": "gas-turbine",
        "syms": ["GEV"],
        "rule": "미국 에너지 정책 변화로 가스터빈 발주가 밀림",
        "q": "가스터빈 발주 지연 미국 발전 정책",
        "must": ["가스터빈", "발전"],
    },
    {
        "id": "boj-carry",
        "syms": ["QQQ"],
        "rule": "엔 캐리 청산 본격화 (엔·닛케이 동시 급변은 Gate가 자동 판정)",
        "q": "엔캐리 청산 일본은행 금리 인상",
        "must": ["엔", "일본"],
    },
]

SEC_TICKERS = ["ETN", "GEV"]
SEC_FORMS = {"8-K", "10-Q", "10-K"}


def days_ago(dt):
    return (datetime.datetime.now(datetime.timezone.utc) - dt).days


def parse_rss_date(s):
    for fmt in ("%a, %d %b %Y %H:%M:%S %Z", "%a, %d %b %Y %H:%M:%S %z"):
        try:
            d = datetime.datetime.strptime(s, fmt)
            if d.tzinfo is None:
                d = d.replace(tzinfo=datetime.timezone.utc)
            return d
        except Exception:
            pass
    return None


def google_news(query):
    url = ("https://news.google.com/rss/search?q="
           + urllib.parse.quote(query)
           + "&hl=ko&gl=KR&ceid=KR:ko")
    r = requests.get(url, timeout=20, headers=UA)
    r.raise_for_status()
    root = ET.fromstring(r.content)
    out = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub = parse_rss_date(item.findtext("pubDate") or "")
        src = item.find("source")
        out.append({
            "title": re.sub(r"\s+", " ", title),
            "url": link,
            "date": pub.strftime("%Y-%m-%d") if pub else "",
            "age": days_ago(pub) if pub else 999,
            "source": (src.text if src is not None else "") or "",
        })
    return out


def collect_news():
    alerts = []
    for rule in RULES:
        try:
            items = google_news(rule["q"])
        except Exception as e:
            ERRORS.append({"src": "news:" + rule["id"], "error": str(e)[:120]})
            continue

        hit = []
        for it in items:
            if it["age"] > NEWS_DAYS:
                continue
            if not any(m in it["title"] for m in rule["must"]):
                continue
            hit.append(it)
            if len(hit) >= PER_RULE:
                break

        for it in hit:
            alerts.append({
                "id": rule["id"], "syms": rule["syms"], "rule": rule["rule"],
                "title": it["title"], "url": it["url"],
                "date": it["date"], "source": it["source"],
            })
    return alerts


def sec_filings():
    """티커 → CIK 는 SEC 공식 매핑을 그때그때 받아서 씁니다. 하드코딩하면 언젠가 틀립니다."""
    out = []
    try:
        r = requests.get("https://www.sec.gov/files/company_tickers.json",
                         timeout=20, headers=UA)
        r.raise_for_status()
        table = {v["ticker"].upper(): v["cik_str"] for v in r.json().values()}
    except Exception as e:
        ERRORS.append({"src": "sec:tickers", "error": str(e)[:120]})
        return out

    today = datetime.date.today()
    for t in SEC_TICKERS:
        cik = table.get(t)
        if not cik:
            ERRORS.append({"src": "sec:" + t, "error": "CIK 없음"})
            continue
        try:
            u = "https://data.sec.gov/submissions/CIK%010d.json" % int(cik)
            r = requests.get(u, timeout=20, headers=UA)
            r.raise_for_status()
            rec = r.json().get("filings", {}).get("recent", {})
            forms = rec.get("form", [])
            dates = rec.get("filingDate", [])
            accs = rec.get("accessionNumber", [])
            docs = rec.get("primaryDocument", [])
            for i in range(min(len(forms), 40)):
                if forms[i] not in SEC_FORMS:
                    continue
                d = datetime.date.fromisoformat(dates[i])
                if (today - d).days > FILING_DAYS:
                    continue
                acc = accs[i].replace("-", "")
                out.append({
                    "sym": t, "form": forms[i], "date": dates[i],
                    "url": "https://www.sec.gov/Archives/edgar/data/%d/%s/%s"
                           % (int(cik), acc, docs[i]),
                })
        except Exception as e:
            ERRORS.append({"src": "sec:" + t, "error": str(e)[:120]})
    return out


def main():
    alerts = collect_news()
    filings = sec_filings()
    doc = {
        "generated_at": datetime.datetime.now(
            datetime.timezone(datetime.timedelta(hours=9))).isoformat(timespec="seconds"),
        "alerts": alerts,
        "filings": filings,
        "rules": [{"id": r["id"], "syms": r["syms"], "rule": r["rule"]} for r in RULES],
        "errors": ERRORS,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    print("wrote %s — 경보 %d건, 공시 %d건, 오류 %d건"
          % (OUT, len(alerts), len(filings), len(ERRORS)))
    for e in ERRORS:
        print("  ! %s: %s" % (e["src"], e["error"]))


if __name__ == "__main__":
    main()
