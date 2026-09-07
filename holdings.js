/* ============================================================
   Gate — 보유 현황
   GitHub 웹 편집기에서 직접 고치는 파일입니다. 월 1회면 충분합니다.

   avg_krw : 토스증권 '원' 표시 기준 1주 평균 금액
   avg_usd : 토스증권 '$' 로 토글했을 때의 1주 평균 금액 (해외종목만)
             → 둘 다 넣으면 Book 탭에서 주가 기여분과 환율 기여분이
               분리되어 보입니다. 비워두면 원화 수익률만 표시됩니다.
   ============================================================ */

window.HOLDINGS = {
  updated: "2026-09-07",

  positions: [
    { sym: "QQQ",       shares: 11, avg_krw: 1018364, avg_usd: null },
    { sym: "267260.KS", shares: 2,  avg_krw: 706000 },
    { sym: "GEV",       shares: 1,  avg_krw: 1289084, avg_usd: null },
    { sym: "ETN",       shares: 0,  avg_krw: 0,       avg_usd: null }
  ],

  // 이번 달 예정 적립액과 대기 현금 (원)
  cash_krw: 0,
  monthly_krw: 0,

  // 올해 순유입 — 월별 입금액 (원)
  inflow_2026: {
    "09": 0, "10": 0, "11": 0, "12": 0
  },

  // 연금계좌 (세액공제 한도 900만)
  pension: {
    year: 2026,
    limit_krw: 9000000,
    paid_krw: 0
  },

  // 분기 논거 — 90일 넘으면 트랜치 알림이 잠깁니다
  thesis: {
    "267260.KS": { updated: "2026-09-07", text: "북미 초고압 변압기 수주잔고. 교체 사이클이 실적으로 확인되는 동안 보유." },
    "GEV":       { updated: "2026-09-07", text: "발전(가스터빈·원자력) + Electrification. AI 전력 수요의 상류." },
    "ETN":       { updated: "2026-09-07", text: "데이터센터 내부 배전·UPS. 세 종목 중 수요처에 가장 가까움." }
  },

  // 매매 기록 (Log 탭)
  trades: [
    // { date: "2026-09-07", sym: "132030.KS", name: "KODEX 은선물(H)", side: "매도", shares: 399, price_krw: 10690, note: "논거 소멸 — 전량 정리" }
  ]
};
