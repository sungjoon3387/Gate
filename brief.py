#!/usr/bin/env python3
"""
Gate — 금리·환율 3줄 브리핑 (선택 기능)

collect.py가 만든 data.json의 숫자만 넘겨 Claude에게 3줄 요약을 받습니다.
ANTHROPIC_API_KEY 환경변수가 없으면 아무것도 하지 않습니다.
실패해도 data.json은 그대로 남습니다.
"""

import json
import os
import ssl
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))
BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data.json")
KEY = os.environ.get("ANTHROPIC_API_KEY")

FIELDS = ["KRW=X", "^FVX", "^TNX", "^TYX", "DX-Y.NYB"]


def main():
    if not KEY:
        print("키 없음 — 건너뜁니다")
        return 0

    with open(DATA, encoding="utf-8") as f:
        d = json.load(f)

    facts = []
    for sym in FIELDS:
        q = d["quotes"].get(sym)
        if not q:
            continue
        facts.append(
            f"- {q['name']}: {q['price']}{q.get('unit','')}, "
            f"전일대비 {q.get('day_pct')}%, 60일 {q.get('chg60_pct')}%, "
            f"20일선 대비 {round((q['price']/q['ma20']-1)*100,2) if q.get('ma20') else '—'}%"
        )

    prompt = (
        "아래는 오늘 아침 기준 금리·환율 수치다. 한국 거주 투자자가 미국 주식(QQQ, GEV, ETN)과 "
        "국내 전력기기주를 보유한 상황에서 출근길에 읽을 브리핑을 한국어 3줄로 써라.\n\n"
        + "\n".join(facts) +
        "\n\n규칙: 각 줄 40자 내외. 숫자가 말하는 사실과 그 함의만 쓴다. "
        "매수·매도 권유를 하지 않는다. 확신에 찬 예측 표현을 쓰지 않는다. "
        "면책 문구나 인사말을 붙이지 않는다. 3줄 외에는 아무것도 출력하지 않는다."
    )

    body = json.dumps({
        "model": "claude-sonnet-4-6",
        "max_tokens": 400,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "content-type": "application/json",
            "x-api-key": KEY,
            "anthropic-version": "2023-06-01",
        },
    )
    with urllib.request.urlopen(req, timeout=60, context=ssl.create_default_context()) as r:
        res = json.loads(r.read().decode())

    text = "\n".join(b.get("text", "") for b in res.get("content", []) if b.get("type") == "text").strip()
    if not text:
        print("빈 응답", file=sys.stderr)
        return 1

    d["brief"] = text
    d["brief_at"] = datetime.now(KST).strftime("%Y-%m-%d %H:%M KST 생성")
    with open(DATA, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
    print("브리핑 저장 완료")
    return 0


if __name__ == "__main__":
    sys.exit(main())
