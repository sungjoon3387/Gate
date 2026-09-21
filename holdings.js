/* ============================================================
   Gate — 보유 현황
   GitHub 웹 편집기에서 직접 고치는 파일입니다. 월 1회면 충분합니다.

   avg_krw : 토스증권 '원' 표시 기준 1주 평균 금액
   avg_usd : 토스증권 '$' 로 토글했을 때의 1주 평균 금액 (해외종목만)
             → 둘 다 넣으면 Book 탭에서 주가 기여분과 환율 기여분이
               분리되어 보입니다.
   ============================================================ */

window.HOLDINGS = {
  updated: "2026-09-22",

  positions: [
    { sym: "QQQ",  shares: 14, avg_krw: 1009571, avg_usd: 711.80 },   // avg_usd 는 추정 — $ 토글로 확인 요망
    { sym: "JEPQ", shares: 35, avg_krw: 82838,   avg_usd: 60.18 },
    { sym: "GEV",  shares: 2,  avg_krw: 1274543, avg_usd: 936.20 },
    { sym: "ETN",  shares: 7,  avg_krw: 564603,  avg_usd: 421.00 }
    // 267260.KS (HD현대일렉트릭) 2026-09-15 전량 매도
  ],

  // 대기 현금 — 실제 잔액으로 고쳐 주세요
  cash_krw: 0,
  monthly_krw: 0,

  inflow_2026: {
    "09": 0, "10": 0, "11": 0, "12": 0
  },

  pension: {
    year: 2026,
    limit_krw: 9000000,
    paid_krw: 0
  },

  trades: [
    { date: "2026-09-15", sym: "267260.KS", name: "HD현대일렉트릭", side: "매도",
      shares: 2, price_krw: 711362,
      note: "2분기 실적은 호조(영업이익 +37.3%, 수주잔고 +29.6%)였으나 주가가 논거를 따라오지 않아 정리. 매도 시점 52주 고점 대비 약 -47%." },
    { date: "2026-09-18", sym: "GEV", name: "GE 버노바", side: "매수",
      shares: 1, price_krw: 1259999,
      note: "전력기기 비중 24% 구간에서 추가. 9월 FOMC 인상 확정 직후." },
    { date: "2026-09-18", sym: "QQQ", name: "QQQ", side: "매수",
      shares: 1, price_krw: 979607,
      note: "코어 적립. 원/달러 1,340원대 환전분." },
    { date: "2026-09-18", sym: "JEPQ", name: "JEPQ", side: "매수",
      shares: 2, price_krw: 81838,
      note: "평단 82,898 → 82,838원." },
    { date: "2026-09-22", sym: "QQQ", name: "QQQ", side: "매수",
      shares: 1, price_krw: 1003539,
      note: "코어 적립. 평단 1,010,035 → 1,009,571원. 원/달러 1,385원 구간." }
  ],

  thesis: {
    "GEV": { updated: "2026-09-10", text: "AI 전력 수요의 최상류(발전). 가스터빈 수주잔고 116GW, 공급이 수요를 못 따라가 가격이 먼저 오른다." },
    "ETN": { updated: "2026-09-10", text: "데이터센터 내부 배전·UPS. 세 종목 중 수요처에 가장 가깝고 수주가 이미 실적으로 넘어오고 있다." }
  }
};
