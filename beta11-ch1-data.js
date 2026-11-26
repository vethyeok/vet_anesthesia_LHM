/* 마취 시뮬레이터 베타 1.1 — Chapter 1 (마취 전 검사) 케이스 데이터 · 혈액검사 엔진 · AI/오프라인 보호자 응답 */
(function () {
  const rd = (v, d = 1) => {
    const p = Math.pow(10, d);
    return Math.round(Number(v) * p) / p;
  };
  const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v)));

  const REF = {
    dog: {
      pH: [7.35, 7.45], pCO2: [35, 45], pO2: [35, 50], Na: [142, 152], K: [3.8, 5.2], Cl: [108, 118], iCa: [1.15, 1.38], Hct: [37, 55],
      pHT: [7.35, 7.45], pCO2T: [35, 45], pO2T: [35, 50], ctCO2: [20, 27], cHCO3: [19, 26], cHCO3std: [19, 26], BEecf: [-4, 4], BEB: [-4, 4], ctHb: [12, 18], iCa74: [1.15, 1.38], pO2Aa: [0, 75], sO2: [65, 85], AGK: [12, 24],
      RBC: [5.5, 8.5], HGB: [12.0, 18.0], HCT: [37, 55], MCV: [60, 77], MCH: [19.5, 24.5], MCHC: [32, 36], RDW: [12, 16], RETIC: [10, 110], ReticHGB: [22.3, 29.6],
      WBC: [5.5, 16.9], Neu: [2.0, 12.0], Lym: [0.5, 4.9], Mono: [0.3, 2.0], Eos: [0.1, 1.49], Baso: [0.0, 0.1],
      PLT: [175, 500], MPV: [8.7, 13.2], PCT: [0.14, 0.46],
      ALP: [20, 150], ALT: [10, 100], AST: [15, 55], GGT: [0, 11], BUN: [7, 27], Crea: [0.5, 1.6], Phos: [2.5, 6.8], Ca: [8.6, 11.8],
      TG: [25, 150], Tchol: [110, 320], Glu: [70, 125], TP: [5.2, 8.2], ALB: [2.5, 4.0], Glob: [2.5, 4.5], Mg: [1.6, 2.5],
      CRP: [0, 10], cPL: [0, 200], proBNP: [0, 900], T4: [1.0, 4.0], Cortisol: [1.0, 6.0], SDMA: [0, 14]
    },
    cat: {
      pH: [7.31, 7.42], pCO2: [32, 42], pO2: [35, 50], Na: [147, 156], K: [3.6, 5.2], Cl: [115, 126], iCa: [1.12, 1.35], Hct: [30, 45],
      pHT: [7.31, 7.42], pCO2T: [32, 42], pO2T: [35, 50], ctCO2: [17, 24], cHCO3: [16, 23], cHCO3std: [16, 23], BEecf: [-5, 2], BEB: [-5, 2], ctHb: [9.5, 15.5], iCa74: [1.12, 1.35], pO2Aa: [0, 75], sO2: [65, 85], AGK: [13, 27],
      RBC: [6.5, 11.5], HGB: [9.5, 15.5], HCT: [30, 45], MCV: [39, 55], MCH: [13, 17], MCHC: [31, 35], RDW: [14, 18], RETIC: [3, 50], ReticHGB: [13.2, 20.8],
      WBC: [5.5, 19.5], Neu: [2.5, 12.5], Lym: [1.5, 7.0], Mono: [0.0, 0.85], Eos: [0.1, 1.5], Baso: [0.0, 0.1],
      PLT: [155, 640], MPV: [11.4, 21.6], PCT: [0.15, 0.55],
      ALP: [14, 111], ALT: [12, 115], AST: [15, 50], GGT: [0, 4], BUN: [16, 36], Crea: [0.8, 2.0], Phos: [3.1, 7.5], Ca: [8.2, 11.2],
      TG: [20, 120], Tchol: [75, 220], Glu: [70, 150], TP: [5.7, 8.9], ALB: [2.3, 3.9], Glob: [2.8, 5.1], Mg: [1.8, 2.6],
      SAA: [0, 5], fPL: [0, 3.5], proBNP: [0, 100], T4: [0.8, 4.7], Cortisol: [0.5, 5.0], SDMA: [0, 14]
    }
  };

  function computeVBG13(m, bt = 38.2) {
    const pH = m.pH, pCO2 = m.pCO2, pO2 = m.pO2;
    const pHT = rd(pH - 0.0147 * (bt - 37.0), 3);
    const pCO2T = rd(pCO2 * Math.pow(10, 0.019 * (bt - 37.0)), 1);
    const pO2T = rd(pO2 * Math.pow(10, 0.025 * (bt - 37.0)), 1);
    const cHCO3 = rd(0.0307 * pCO2 * Math.pow(10, pH - 6.1), 1);
    const ctCO2 = rd(cHCO3 + 0.0307 * pCO2, 1);
    const cHCO3std = rd(cHCO3 + 0.25 * (40 - pCO2) * 0.4, 1);
    const ctHb = rd(m.Hct / 3.0, 1);
    const BEecf = rd((cHCO3 - 24.8) + 16.2 * (pH - 7.4), 1);
    const BEB = rd((1 - 0.014 * ctHb) * ((cHCO3 - 24.8) + (1.43 * ctHb + 7.7) * (pH - 7.4)), 1);
    const iCa74 = rd(m.iCa * (1 - 0.53 * (7.4 - pH)), 2);
    const pO2Aa = rd(Math.max(2.0, (150 - pCO2 / 0.8) - pO2), 1);
    const p50 = 28 * Math.pow(10, 0.48 * (7.4 - pH));
    const sO2 = rd(cl((Math.pow(pO2, 2.7) / (Math.pow(pO2, 2.7) + Math.pow(p50, 2.7))) * 100, 25, 99), 1);
    const AGK = rd((m.Na + m.K) - (m.Cl + cHCO3), 1);
    return { pHT, pCO2T, pO2T, ctCO2, cHCO3, cHCO3std, BEecf, BEB, ctHb, iCa74, pO2Aa, sO2, AGK };
  }

  function buildCBC(sp, ov = {}) {
    const isCat = sp === 'cat';
    const HCT = ov.HCT ?? ov.Hct ?? (isCat ? 38.2 : 45.4);
    const HGB = ov.HGB ?? rd(HCT / 3.02, 1);
    const MCV = ov.MCV ?? (isCat ? 46.5 : 68.4);
    const RBC = ov.RBC ?? rd((HCT * 10) / MCV, 2);
    const MCH = rd((HGB * 10) / Math.max(1, RBC), 1);
    const MCHC = rd((HGB * 100) / Math.max(1, HCT), 1);
    const RDW = ov.RDW ?? (isCat ? 15.8 : 13.8);
    const RETIC = ov.RETIC ?? (isCat ? 24 : 52);
    const ReticHGB = ov.ReticHGB ?? (isCat ? 16.5 : 25.8);
    const WBC = ov.WBC ?? (isCat ? 10.4 : 9.8);
    const neuP = ov.neuP ?? (isCat ? 62 : 68);
    const lymP = ov.lymP ?? (isCat ? 28 : 22);
    const monoP = ov.monoP ?? 5.5;
    const eosP = ov.eosP ?? 4.0;
    const basoP = rd(Math.max(0.1, 100 - neuP - lymP - monoP - eosP), 1);
    const PLT = ov.PLT ?? (isCat ? 295 : 280);
    const MPV = ov.MPV ?? (isCat ? 14.5 : 10.4);
    const PCT = rd(cl((PLT * MPV) / 10000, 0.05, 0.8), 2);
    return {
      RBC, HGB, HCT, MCV, MCH, MCHC, RDW, RETIC, ReticHGB,
      WBC,
      Neu: rd(WBC * neuP / 100, 2), neuP,
      Lym: rd(WBC * lymP / 100, 2), lymP,
      Mono: rd(WBC * monoP / 100, 2), monoP,
      Eos: rd(WBC * eosP / 100, 2), eosP,
      Baso: rd(WBC * basoP / 100, 2), basoP,
      PLT, MPV, PCT
    };
  }

  function buildChem(sp, ov = {}) {
    const isCat = sp === 'cat';
    const base = {
      ALP: ov.ALP ?? (isCat ? 48 : 68),
      ALT: ov.ALT ?? (isCat ? 46 : 42),
      AST: ov.AST ?? (isCat ? 28 : 31),
      GGT: ov.GGT ?? (isCat ? 1.5 : 4.2),
      BUN: ov.BUN ?? (isCat ? 23 : 16),
      Crea: ov.Crea ?? (isCat ? 1.3 : 1.0),
      Phos: ov.Phos ?? (isCat ? 4.6 : 4.1),
      Ca: ov.Ca ?? (isCat ? 9.5 : 10.1),
      TG: ov.TG ?? (isCat ? 52 : 68),
      Tchol: ov.Tchol ?? (isCat ? 138 : 198),
      Glu: ov.Glu ?? (isCat ? 108 : 96),
      TP: ov.TP ?? (isCat ? 6.9 : 6.6),
      ALB: ov.ALB ?? (isCat ? 3.2 : 3.3),
      Mg: ov.Mg ?? (isCat ? 2.1 : 2.0),
      proBNP: ov.proBNP ?? (isCat ? 42 : 320),
      T4: ov.T4 ?? (isCat ? 2.1 : 2.2),
      Cortisol: ov.Cortisol ?? (isCat ? 2.4 : 2.8),
      SDMA: ov.SDMA ?? 9
    };
    base.Glob = ov.Glob ?? rd(Math.max(1.2, base.TP - base.ALB), 1);
    if (isCat) {
      base.SAA = ov.SAA ?? 1.8;
      base.fPL = ov.fPL ?? 1.6;
    } else {
      base.CRP = ov.CRP ?? 3.2;
      base.cPL = ov.cPL ?? 65;
    }
    return base;
  }

  function flagOf(sp, key, val) {
    const r = REF[sp] && REF[sp][key];
    if (!r) return '';
    if (val < r[0]) return 'L';
    if (val > r[1]) return 'H';
    return '';
  }

  function buildLabPanel(c) {
    const sp = c.species === 'cat' ? 'cat' : 'dog';
    const isCat = sp === 'cat';
    const L = c.lab || {};
    const vbgM = {
      pH: L.pH ?? (isCat ? 7.36 : 7.39),
      pCO2: L.pCO2 ?? (isCat ? 37 : 40),
      pO2: L.pO2 ?? 42,
      Na: L.Na ?? (isCat ? 151 : 146),
      K: L.K ?? (isCat ? 4.2 : 4.4),
      Cl: L.Cl ?? (isCat ? 120 : 113),
      iCa: L.iCa ?? (isCat ? 1.24 : 1.26),
      Hct: L.Hct ?? L.HCT ?? (isCat ? 38 : 45)
    };
    const vbgC = computeVBG13(vbgM, c.pe ? c.pe.bt : 38.2);
    const cbc = buildCBC(sp, L);
    const chem = buildChem(sp, L);
    return { sp, ref: REF[sp], vbgM, vbgC, cbc, chem, flagOf: (k, v) => flagOf(sp, k, v) };
  }

  /* 11 Fixed Scenarios: Tutorial + 5 Dog Cases + 5 Cat Cases */
  const FIXED_CASES = {
    tutorial: {
      id: 'tutorial',
      species: 'dog',
      name: '코코',
      breed: '말티즈',
      age: '2세',
      weight: 3.4,
      sex: '미중성화 암컷 (IF)',
      chiefComplaint: '예방적 난소자궁적출술(중성화) 및 스케일링 예정',
      ownerPersonality: 'neutral',
      ownerLevel: 2,
      ownerGreeting: '안녕하세요 선생님, 오늘 코코 중성화 수술 전에 검사 받으러 왔습니다.',
      ownerClue: '예방적 중성화 수술 내원. 12시간 금식 완료, 수술·알러지 이력 없고 평소 활력과 식욕 매우 양호함.',
      history: [
        { key: 'hx_surg', label: '수술 이력', text: '이전 마취 및 수술 이력 없음', keywords: ['수술', '마취', '이전', '경험', '이력'] },
        { key: 'hx_allergy', label: '알러지', text: '약물 및 식이 알러지 특이사항 없음', keywords: ['알러지', '과민', '부작용', '두드러기'] },
        { key: 'hx_fast', label: '금식 / 특이사항', text: '12시간 금식 완료, 복용 약물 없음, 활력·식욕 정상', keywords: ['금식', '밥', '먹', '약', '복용', '증상', '특이'] }
      ],
      pe: { bt: 38.4, bpSys: 122, bpDia: 76, bpMap: 91, cuff: 2, hr: 112, rr: 24, crt: 1.5, mmc: 'wet - pink' },
      lab: { pH: 7.40, pCO2: 39, pO2: 43, Na: 146, K: 4.3, Cl: 113, iCa: 1.26, Hct: 44, WBC: 9.2, PLT: 310, ALP: 58, ALT: 36, BUN: 14, Crea: 0.8, Glu: 98, TP: 6.4, ALB: 3.4 },
      imaging: {
        thoracic: { vhs: '9.6v', vlas: '1.9v (RLAD 1.4v)', trachea: '정상 주행 및 내경 유지', lung: '정상 폐야 (특이 침윤 없음)', extra: '흉강 내 특이 소견 없음' },
        abdominal: null,
        ultrasound: null
      },
      trueAsa: 1,
      trueEmergency: false,
      truePrognosis: 'Good'
    },

    asymp_dog: {
      id: 'asymp_dog',
      species: 'dog',
      name: '보리',
      breed: '토이 푸들',
      age: '1세 6개월',
      weight: 4.2,
      sex: '미중성화 수컷 (IM)',
      chiefComplaint: '정기 중성화 수술(거세) 및 유치 발치',
      ownerPersonality: 'optimistic',
      ownerLevel: 2,
      ownerGreeting: '선생님 안녕하세요! 보리 오늘 중성화랑 유치 빼러 왔어요. 평소 워낙 튼튼해서 금방 끝나겠죠?',
      ownerClue: '건강한 어린 수컷 푸들. 어젯밤 10시부터 금식, 예방접종 완료, 수술·알러지·기저질환 전혀 없음.',
      history: [
        { key: 'hx_surg', label: '수술 이력', text: '없음 (첫 전신마취)', keywords: ['수술', '마취', '이전', '경험', '이력'] },
        { key: 'hx_allergy', label: '알러지', text: '알려진 약물·음식 알러지 없음', keywords: ['알러지', '과민', '부작용'] },
        { key: 'hx_fast', label: '금식 / 복용약', text: '10시간 금식 완료, 복용 약물 없음, 심장사상충 예방 중', keywords: ['금식', '밥', '먹', '약', '복용', '예방', '특이'] }
      ],
      pe: { bt: 38.5, bpSys: 126, bpDia: 78, bpMap: 94, cuff: 2, hr: 108, rr: 22, crt: 1.5, mmc: 'wet - pink' },
      lab: { pH: 7.41, pCO2: 38, pO2: 44, Na: 147, K: 4.4, Cl: 112, iCa: 1.27, Hct: 46, WBC: 8.9, PLT: 295, ALP: 64, ALT: 34, BUN: 15, Crea: 0.9, Glu: 101, TP: 6.5, ALB: 3.5 },
      imaging: {
        thoracic: { vhs: '9.8v', vlas: '2.0v (RLAD 1.5v)', trachea: '정상 주행 및 내경 유지', lung: '정상 폐야 (침윤 및 종괴 없음)', extra: '특이사항 없음' },
        abdominal: null,
        ultrasound: null
      },
      trueAsa: 1,
      trueEmergency: false,
      truePrognosis: 'Good'
    },

    asymp_cat: {
      id: 'asymp_cat',
      species: 'cat',
      name: '치즈',
      breed: '코리안 숏헤어',
      age: '1세',
      weight: 3.8,
      sex: '미중성화 암컷 (IF)',
      chiefComplaint: '예방적 중성화 수술(OHE) 내원',
      ownerPersonality: 'indifferent',
      ownerLevel: 1,
      ownerGreeting: '네, 치즈 중성화 예약하고 왔어요. 검사하고 알아서 잘 진행해 주세요.',
      ownerClue: '실내 생활 중인 1세 건강한 암컷 고양이. 어젯밤부터 사료 치워 둠. 수술·알러지 이력 없고 기침·구토 없음.',
      history: [
        { key: 'hx_surg', label: '수술 이력', text: '이전 수술 및 마취 이력 없음', keywords: ['수술', '마취', '이전', '경험', '이력'] },
        { key: 'hx_allergy', label: '알러지', text: '특이 알러지 이력 없음', keywords: ['알러지', '과민', '부작용'] },
        { key: 'hx_fast', label: '금식 / 특이사항', text: '10시간 금식 완료, 실내 사육, 복용 약물 및 이상 증상 없음', keywords: ['금식', '밥', '먹', '사료', '약', '복용', '증상', '특이'] }
      ],
      pe: { bt: 38.6, bpSys: 132, bpDia: 82, bpMap: 99, cuff: 2, hr: 168, rr: 28, crt: 1.5, mmc: 'wet - pink' },
      lab: { pH: 7.37, pCO2: 36, pO2: 43, Na: 151, K: 4.1, Cl: 120, iCa: 1.23, Hct: 39, WBC: 9.6, PLT: 320, ALP: 42, ALT: 40, BUN: 21, Crea: 1.1, Glu: 118, TP: 6.8, ALB: 3.3, proBNP: 38, SAA: 1.2 },
      imaging: {
        thoracic: { vhs: '7.4v', vlas: '1.6v (RLAD 1.2v)', trachea: '정상 주행 및 내경 유지', lung: '정상 폐야 (폐수종·흉수 없음)', extra: '심장 음영 정상' },
        abdominal: null,
        ultrasound: null
      },
      trueAsa: 1,
      trueEmergency: false,
      truePrognosis: 'Good'
    },

    mild_dog: {
      id: 'mild_dog',
      species: 'dog',
      name: '몽이',
      breed: '비숑 프리제',
      age: '6세',
      weight: 6.1,
      sex: '중성화 수컷 (CM)',
      chiefComplaint: '좌측 슬개골 탈구(MPL 2기) 교정술 예정',
      ownerPersonality: 'neutral',
      ownerLevel: 3,
      ownerGreeting: '안녕하세요 선생님. 몽이 왼쪽 뒷다리 슬개골 수술 전에 검사 받으러 왔습니다.',
      ownerClue: '2년 전 중성화 마취 무탈함. 아토피로 아포퀠 복용 중. 닭고기 알러지 있음. 어젯밤부터 금식했고 간헐적 파행 외 전신 상태 양호.',
      history: [
        { key: 'hx_surg', label: '수술 이력', text: '4세 때 중성화 수술 (마취 합병증 없음)', keywords: ['수술', '마취', '이전', '경험', '이력'] },
        { key: 'hx_allergy', label: '알러지', text: '닭고기 식이 알러지 및 경도 아토피 피부염', keywords: ['알러지', '과민', '피부', '부작용'] },
        { key: 'hx_med', label: '복용약 / 금식', text: 'Oclacitinib(아포퀠) 복용 중, 12시간 금식 완료', keywords: ['약', '복용', '금식', '밥', '먹', '병력', '특이'] }
      ],
      pe: { bt: 38.6, bpSys: 134, bpDia: 84, bpMap: 101, cuff: 3, hr: 116, rr: 26, crt: 1.5, mmc: 'wet - pink' },
      lab: { pH: 7.39, pCO2: 39, pO2: 42, Na: 146, K: 4.3, Cl: 113, iCa: 1.25, Hct: 45, WBC: 10.6, PLT: 315, ALP: 162, ALT: 68, BUN: 17, Crea: 1.0, Glu: 104, TP: 6.8, ALB: 3.3, CRP: 6.5 },
      imaging: {
        thoracic: { vhs: '10.1v', vlas: '2.1v (RLAD 1.6v)', trachea: '정상 주행 및 내경 유지', lung: '정상 폐야 (경미한 기관지 패턴)', extra: '심폐 특이 이상 없음' },
        abdominal: '간 크기 정상, 위장 내 가스 소량, 신장 크기 정상, 좌측 슬개골 내측 변위 소견',
        ultrasound: null
      },
      trueAsa: 2,
      trueEmergency: false,
      truePrognosis: 'Good'
    },

    mild_cat: {
      id: 'mild_cat',
      species: 'cat',
      name: '루나',
      breed: '브리티시 숏헤어',
      age: '5세',
      weight: 5.8,
      sex: '중성화 암컷 (SF)',
      chiefComplaint: '치아흡수병변(FORL) 및 치은염 발치 예정',
      ownerPersonality: 'anxious',
      ownerLevel: 3,
      ownerGreeting: '선생님, 루나가 요즘 사료를 씹다가 떨어뜨려서 치과 수술을 해야 한다는데 마취가 괜찮을까요?',
      ownerClue: '1세 때 중성화 마취 무탈. 약간 과체중(BCS 7/9)이고 병원 오면 긴장을 많이 함. 약물 알러지 없고 10시간 금식 완료.',
      history: [
        { key: 'hx_surg', label: '수술 이력', text: '1세 중성화 수술 (특이 합병증 없음)', keywords: ['수술', '마취', '이전', '경험', '이력'] },
        { key: 'hx_allergy', label: '알러지', text: '약물 알러지 없음', keywords: ['알러지', '과민', '부작용'] },
        { key: 'hx_med', label: '특이사항 / 금식', text: '경도 비만(BCS 7/9), 병원 스트레스 심함, 10시간 금식 완료', keywords: ['약', '복용', '금식', '밥', '먹', '증상', '체중', '비만', '특이'] }
      ],
      pe: { bt: 38.7, bpSys: 148, bpDia: 92, bpMap: 111, cuff: 2, hr: 186, rr: 34, crt: 1.5, mmc: 'wet - pink' },
      lab: { pH: 7.36, pCO2: 35, pO2: 43, Na: 152, K: 4.2, Cl: 120, iCa: 1.24, Hct: 40, WBC: 12.1, PLT: 305, ALP: 52, ALT: 54, BUN: 24, Crea: 1.4, Glu: 178, TP: 7.3, ALB: 3.4, proBNP: 58, SAA: 4.2 },
      imaging: {
        thoracic: { vhs: '7.6v', vlas: '1.7v (RLAD 1.3v)', trachea: '정상 주행 및 내경 유지', lung: '정상 폐야 (흉벽 지방 침착 경도)', extra: '심비대 소견 없음' },
        abdominal: null,
        ultrasound: '심장 초음파: LA/Ao 1.25, IVSd 4.8 mm, LVPWd 4.6 mm (비대성 심근병증 소견 없음)'
      },
      trueAsa: 2,
      trueEmergency: false,
      truePrognosis: 'Fair'
    },

    geriatric_dog: {
      id: 'geriatric_dog',
      species: 'dog',
      name: '초코',
      breed: '말티즈',
      age: '13세',
      weight: 4.6,
      sex: '중성화 수컷 (CM)',
      chiefComplaint: '중등도 치주염 다발 발치 및 스케일링 예정',
      ownerPersonality: 'anxious',
      ownerLevel: 4,
      ownerGreeting: '선생님, 초코가 나이가 많고 심장약도 먹고 있어서 치과 마취가 너무 걱정돼요. 꼼꼼히 봐주세요.',
      ownerClue: '1년 전 MMVD Stage B2 진단, 피모벤단(베트메딘) BID 복용 중. 아침 심장약은 소량 물과 복용했고 사료는 10시간 금식. 가끔 흥분 시 켁켁거리는 기침 있음.',
      history: [
        { key: 'hx_surg', label: '수술 이력', text: '2세 중성화 수술 이후 전신마취 이력 없음', keywords: ['수술', '마취', '이전', '경험', '이력'] },
        { key: 'hx_allergy', label: '알러지', text: '알려진 약물 알러지 없음', keywords: ['알러지', '과민', '부작용'] },
        { key: 'hx_med', label: '기저질환 / 복용약', text: 'MMVD Stage B2 진단, Pimobendan BID 복용 중 (아침 약 투여함)', keywords: ['심장', '약', '복용', '질환', '병력', '피모벤단', '베트메딘'] },
        { key: 'hx_fast', label: '금식 / 최근 증상', text: '10시간 금식 완료, 흥분 시 간헐적 마른 기침 동반', keywords: ['금식', '밥', '기침', '호흡', '증상', '특이'] }
      ],
      pe: { bt: 38.2, bpSys: 138, bpDia: 84, bpMap: 102, cuff: 2, hr: 134, rr: 32, crt: 2.0, mmc: 'wet - pink (좌측 심첨부 수축기 잡음 3/6)' },
      lab: { pH: 7.38, pCO2: 38, pO2: 41, Na: 145, K: 4.5, Cl: 112, iCa: 1.24, Hct: 41, WBC: 11.4, PLT: 340, ALP: 196, ALT: 88, BUN: 29, Crea: 1.3, Glu: 102, TP: 6.9, ALB: 3.1, proBNP: 1420, SDMA: 13, CRP: 8.5 },
      imaging: {
        thoracic: { vhs: '11.3v (경도~중등도 심비대)', vlas: '2.6v (RLAD 2.0v · 좌심방 확장)', trachea: '기관 원위부 경도 등쪽 변위', lung: '폐정맥 경도 확장, 명확한 폐수종 침윤 없음', extra: 'MMVD Stage B2 부합' },
        abdominal: '간 실질 경도 종대, 신장 크기 정상 범위',
        ultrasound: '심장 초음파: LA/Ao 1.72, LVIDDn 1.78, 승모판 역류(MR) 중등도, 폐고혈압 소견 없음'
      },
      trueAsa: 3,
      trueEmergency: false,
      truePrognosis: 'Fair'
    },

    geriatric_cat: {
      id: 'geriatric_cat',
      species: 'cat',
      name: '나비',
      breed: '페르시안',
      age: '14세',
      weight: 3.4,
      sex: '중성화 암컷 (SF)',
      chiefComplaint: '만성 구내염 및 치주염 전발치 예정',
      ownerPersonality: 'neutral',
      ownerLevel: 4,
      ownerGreeting: '안녕하세요. 나비가 14살인데 구내염 때문에 밥을 잘 못 먹어서 발치 상담하러 왔습니다.',
      ownerClue: '만성신장병 IRIS Stage 2 관리 중(신장 처방식, 텔미사르탄 복용). 최근 2개월간 물을 많이 마시고 체중이 0.4kg 빠짐. 8시간 금식함.',
      history: [
        { key: 'hx_surg', label: '수술 이력', text: '1세 중성화 수술 외 없음', keywords: ['수술', '마취', '이전', '경험', '이력'] },
        { key: 'hx_allergy', label: '알러지', text: '특이 약물 알러지 없음', keywords: ['알러지', '과민', '부작용'] },
        { key: 'hx_med', label: '기저질환 / 복용약', text: '만성신장병(CKD IRIS 2기), Telmisartan(세민트라) 복용 중', keywords: ['신장', '약', '복용', '질환', '병력', '세민트라', '혈압'] },
        { key: 'hx_fast', label: '금식 / 최근 증상', text: '8시간 금식 완료, 최근 다음다뇨 및 0.4kg 체중 감소', keywords: ['금식', '밥', '물', '체중', '증상', '구토', '특이'] }
      ],
      pe: { bt: 37.9, bpSys: 162, bpDia: 96, bpMap: 118, cuff: 2, hr: 196, rr: 32, crt: 2.0, mmc: 'slightly dry - pale pink' },
      lab: { pH: 7.30, pCO2: 34, pO2: 41, Na: 153, K: 3.4, Cl: 121, iCa: 1.21, Hct: 28, WBC: 12.8, PLT: 260, ALP: 74, ALT: 98, BUN: 48, Crea: 2.6, Phos: 6.4, Glu: 132, TP: 7.8, ALB: 3.1, proBNP: 135, T4: 5.4, SDMA: 19, SAA: 6.4 },
      imaging: {
        thoracic: { vhs: '7.9v (경계성 심비대)', vlas: '1.8v (RLAD 1.4v)', trachea: '정상 주행', lung: '노령성 경도 기관지 패턴, 폐수종 없음', extra: '경계성 좌심실 비대 의심' },
        abdominal: '양측 신장 크기 경도 감소 및 변연 불규칙(만성신장병 변화)',
        ultrasound: '복부 초음파: 양측 신피질 에코 증가, 피수질 경계 불명확 / 심초음파: IVSd 5.8mm 경도 비대'
      },
      trueAsa: 3,
      trueEmergency: false,
      truePrognosis: 'Guarded'
    },

    severe_dog: {
      id: 'severe_dog',
      species: 'dog',
      name: '똘이',
      breed: '시츄',
      age: '11세',
      weight: 6.8,
      sex: '중성화 수컷 (CM)',
      chiefComplaint: '2일간 지속된 구토·황달·복통으로 담낭절제술 의뢰',
      ownerPersonality: 'urgent',
      ownerLevel: 3,
      ownerGreeting: '선생님, 똘이가 이틀 전부터 계속 토하고 눈 흰자가 노랗게 변해서 큰 병원으로 가보래요! 수술해야 하나요?',
      ownerClue: '이전 병원에서 담낭점액종 의심 소견 듣고 전원됨. 이틀째 절식 및 구토 반복, 기력 극심 저하. 쿠싱 의심 이력 있으나 투약 전.',
      history: [
        { key: 'hx_surg', label: '수술 이력', text: '3세 중성화 외 수술 이력 없음', keywords: ['수술', '마취', '이전', '경험', '이력'] },
        { key: 'hx_allergy', label: '알러지', text: '알려진 알러지 없음', keywords: ['알러지', '과민', '부작용'] },
        { key: 'hx_med', label: '병력 / 최근 증상', text: '이틀간 반복 구토·식욕부진·황달·복부 통증, 이전 병원 담낭점액종 의심', keywords: ['구토', '황달', '담낭', '복통', '증상', '약', '병력', '질환'] },
        { key: 'hx_fast', label: '금식 상태', text: '48시간 이상 자발적 절식 (물 소량 섭취 후 구토)', keywords: ['금식', '밥', '먹', '물', '특이'] }
      ],
      pe: { bt: 39.4, bpSys: 92, bpDia: 54, bpMap: 67, cuff: 3, hr: 152, rr: 38, crt: 2.5, mmc: 'dry - yellow (icteric)' },
      lab: { pH: 7.26, pCO2: 33, pO2: 38, Na: 139, K: 3.5, Cl: 103, iCa: 1.11, Hct: 34, WBC: 26.4, neuP: 84, lymP: 7, PLT: 168, ALP: 1840, ALT: 620, AST: 215, GGT: 64, BUN: 34, Crea: 1.5, Tchol: 388, Glu: 78, TP: 5.4, ALB: 2.1, CRP: 118, cPL: 480 },
      imaging: {
        thoracic: { vhs: '10.0v', vlas: '2.0v (RLAD 1.5v)', trachea: '정상', lung: '특이 폐침윤 없음', extra: '횡격막 전방 특이 소견 없음' },
        abdominal: '전복부 장막 디테일 감소(복수/복막염 의심), 간 종대, 담낭 영역 연부조직 음영 증가',
        ultrasound: '복부 초음파: 담낭 내 전형적 키위 패턴(담낭점액종), 담낭벽 비후 및 연속성 소실 의심, 담낭 주위 고에코 지방 및 소량 복수(담즙성 복막염 의심)'
      },
      trueAsa: 4,
      trueEmergency: true,
      truePrognosis: 'Poor'
    },

    severe_cat: {
      id: 'severe_cat',
      species: 'cat',
      name: '까미',
      breed: '러시안 블루',
      age: '9세',
      weight: 5.2,
      sex: '중성화 수컷 (CM)',
      chiefComplaint: '36시간 무뇨 및 잦은 화장실 들락거림, 기력 저하로 응급 내원',
      ownerPersonality: 'urgent',
      ownerLevel: 2,
      ownerGreeting: '선생님 빨리 좀 봐주세요! 까미가 어제 아침부터 소변을 한 방울도 못 누고 지금 축 늘어졌어요!',
      ownerClue: '36시간째 배뇨 불가, 어제저녁부터 3회 구토, 오늘 아침부터 옆으로 누워 기력 없음. 과거 방광염 1회 앓은 적 있음.',
      history: [
        { key: 'hx_surg', label: '수술 이력', text: '1세 중성화 수술', keywords: ['수술', '마취', '이전', '경험', '이력'] },
        { key: 'hx_allergy', label: '알러지', text: '알려진 알러지 없음', keywords: ['알러지', '과민', '부작용'] },
        { key: 'hx_med', label: '병력 / 증상', text: '36시간 무뇨(요도폐색 의심), 구토 3회, 과거 하부요로계질환(FLUTD) 이력', keywords: ['소변', '배뇨', '무뇨', '요도', '방광', '구토', '증상', '병력', '약'] },
        { key: 'hx_fast', label: '금식 상태', text: '24시간 이상 식욕 전무', keywords: ['금식', '밥', '먹', '특이'] }
      ],
      pe: { bt: 36.6, bpSys: 88, bpDia: 52, bpMap: 64, cuff: 2, hr: 118, rr: 36, crt: 2.8, mmc: 'dry - pale pink (방광 극심 팽만·경직)' },
      lab: { pH: 7.18, pCO2: 31, pO2: 36, Na: 144, K: 7.4, Cl: 114, iCa: 0.96, Hct: 47, WBC: 16.2, PLT: 245, ALP: 46, ALT: 62, BUN: 112, Crea: 7.8, Phos: 9.8, Glu: 164, TP: 8.2, ALB: 3.6, SDMA: 42, SAA: 18 },
      imaging: {
        thoracic: { vhs: '7.5v', vlas: '1.6v (RLAD 1.2v)', trachea: '정상', lung: '정상 폐야', extra: 'ECG: 서맥 및 Tenting T파, P파 소실 의심(고칼륨혈증)' },
        abdominal: '방광 극심 팽만, 음경 요도 부위 방사선 비투과성 미세 결석/슬러지 의심',
        ultrasound: '복부 초음파: 방광 내 다량 에코성 침전물, 양측 신우 경도 확장(수신증 초기)'
      },
      trueAsa: 4,
      trueEmergency: true,
      truePrognosis: 'Poor'
    },

    emerg_dog: {
      id: 'emerg_dog',
      species: 'dog',
      name: '맥스',
      breed: '저먼 셰퍼드',
      age: '9세',
      weight: 34.0,
      sex: '중성화 수컷 (CM)',
      chiefComplaint: '식후 2시간 뒤 급성 복부 팽만, 헛구역질 및 허탈로 초응급 내원',
      ownerPersonality: 'urgent',
      ownerLevel: 5,
      ownerGreeting: '선생님, 맥스가 저녁 먹고 2시간 만에 배가 북처럼 부풀고 헛구역질하다가 쓰러졌습니다! GDV 같은데 바로 수술 들어가야 하죠?',
      ownerClue: '저녁 식사 후 급성 복부 팽만 및 비생산성 헛구역질, 20분 전 허탈 발생. 심한 빈맥·창백 점막. 금식 안 됨(식후 2시간).',
      history: [
        { key: 'hx_surg', label: '수술 이력', text: '2세 중성화 수술 (위고정술 미실시)', keywords: ['수술', '마취', '이전', '경험', '이력', '위고정'] },
        { key: 'hx_allergy', label: '알러지', text: '약물 알러지 없음', keywords: ['알러지', '과민', '부작용'] },
        { key: 'hx_med', label: '급성 증상 / 병력', text: '급성 복부 팽만, 비생산성 헛구역질, 허탈(GDV 강력 의심), 기저질환 없음', keywords: ['복부', '팽만', '헛구역질', '구토', '허탈', '쓰러', '증상', '병력', '약'] },
        { key: 'hx_fast', label: '금식 상태', text: '미금식 (2시간 전 사료 다량 급여 및 음수)', keywords: ['금식', '밥', '먹', '사료', '식사', '특이'] }
      ],
      pe: { bt: 37.1, bpSys: 72, bpDia: 40, bpMap: 51, cuff: 5, hr: 184, rr: 48, crt: 3.5, mmc: 'dry - pale / muddy (복부 고창·고음 타진)' },
      lab: { pH: 7.14, pCO2: 29, pO2: 33, Na: 141, K: 3.3, Cl: 102, iCa: 1.04, Hct: 56, WBC: 21.8, neuP: 86, lymP: 5, PLT: 118, ALP: 185, ALT: 142, BUN: 44, Crea: 2.3, Glu: 66, TP: 5.8, ALB: 2.4, CRP: 94 },
      imaging: {
        thoracic: { vhs: '8.9v (소심증 · 저혈량 쇼크)', vlas: '1.7v', trachea: '정상', lung: '저관류 폐야, 후대정맥(CVC) 직경 현저히 감소', extra: 'ECG: 다발성 심실조기수축(VPCs) 관찰' },
        abdominal: '우측 횡와위 X-ray: 전형적 Double Bubble (Popeye arm / Smurf hat) 징후 — 위확장염전(GDV) 확진, 비장 종대·변위',
        ultrasound: '응급 FAST: 비장 울혈, 위벽 부종 및 소량 복강 내 유리액'
      },
      trueAsa: 5,
      trueEmergency: true,
      truePrognosis: 'Grave'
    },

    emerg_cat: {
      id: 'emerg_cat',
      species: 'cat',
      name: '모찌',
      breed: '스코티시 폴드',
      age: '7세',
      weight: 4.4,
      sex: '중성화 수컷 (CM)',
      chiefComplaint: '갑작스러운 개구호흡, 후지 마비 및 청색증으로 초응급 내원',
      ownerPersonality: 'urgent',
      ownerLevel: 4,
      ownerGreeting: '선생님 모찌가 갑자기 입 벌리고 숨을 못 쉬면서 뒷다리를 못 움직여요! 심장병(HCM) 진단은 예전에 받았었어요!',
      ownerClue: '1년 전 HCM 진단 받았으나 최근 3개월 투약 중단. 1시간 전 급성 개구호흡 및 양측 후지 냉감·마비(ATE 동반 의심). 마지막 식사 4시간 전.',
      history: [
        { key: 'hx_surg', label: '수술 이력', text: '1세 중성화 수술', keywords: ['수술', '마취', '이전', '경험', '이력'] },
        { key: 'hx_allergy', label: '알러지', text: '알려진 약물 알러지 없음', keywords: ['알러지', '과민', '부작용'] },
        { key: 'hx_med', label: '기저질환 / 복용약', text: '비대성 심근병증(HCM) 진단 이력, 최근 3개월 Clopidogrel·이뇨제 임의 중단', keywords: ['심장', 'HCM', '약', '복용', '질환', '병력', '이뇨제', '혈전'] },
        { key: 'hx_fast', label: '급성 증상 / 금식', text: '1시간 전 급성 개구호흡·후지 마비, 4시간 전 습식 급여(미금식)', keywords: ['호흡', '개구', '다리', '마비', '금식', '밥', '먹', '증상', '특이'] }
      ],
      pe: { bt: 35.8, bpSys: 78, bpDia: 46, bpMap: 57, cuff: 2, hr: 228, rr: 68, crt: 3.5, mmc: 'dry - cyanotic / pale (양측 대퇴동맥 맥박 소실, 분마음 청진)' },
      lab: { pH: 7.16, pCO2: 49, pO2: 29, Na: 150, K: 5.9, Cl: 117, iCa: 1.08, Hct: 44, WBC: 18.4, PLT: 142, ALP: 58, ALT: 196, AST: 340, BUN: 52, Crea: 2.9, Glu: 248, TP: 7.1, ALB: 3.2, proBNP: 980, SAA: 24 },
      imaging: {
        thoracic: { vhs: '9.1v (심한 심비대 · Valentine heart)', vlas: '2.5v', trachea: '기관 등쪽 거상', lung: '미만성 폐포성·간질성 침윤(급성 심인성 폐수종) 및 중등도 흉수', extra: '산소화 극심 저하' },
        abdominal: '특이 복강 종괴 없음',
        ultrasound: '응급 TFAST / 심초음파: LA/Ao 2.45 (중증 좌심방 확장), 좌심방 내 자발 에코 대조(Smoke) 및 혈전 관찰, B-lines 다발성'
      },
      trueAsa: 5,
      trueEmergency: true,
      truePrognosis: 'Grave'
    }
  };

  /* Fallback pool for 실전 (AI 랜덤 시나리오) when API is offline */
  const PRACTICE_FALLBACK = {
    dog: [
      {
        species: 'dog', name: '두부', breed: '포메라니안', age: '10세', weight: 3.1, sex: '중성화 암컷 (SF)',
        chiefComplaint: '유선종양 절제술 및 중성화 잔존 조직 확인',
        ownerClue: '6개월 전부터 유선 멍울 커짐. 기관허탈 2기 있어 흥분 시 거위울음 소리 기침. 10시간 금식 완료. 약물 알러지 없음.',
        history: [
          { key: 'hx_surg', label: '수술 이력', text: '3세 중성화 수술', keywords: ['수술', '마취', '이전', '이력'] },
          { key: 'hx_allergy', label: '알러지', text: '알려진 알러지 없음', keywords: ['알러지', '과민', '부작용'] },
          { key: 'hx_med', label: '병력 / 복용약', text: '기관허탈 2기 (간헐적 기관지확장제 복용), 유선종양 6개월 경과', keywords: ['기침', '기관', '약', '복용', '병력', '질환', '종양'] },
          { key: 'hx_fast', label: '금식 상태', text: '10시간 금식 완료', keywords: ['금식', '밥', '먹', '특이'] }
        ],
        pe: { bt: 38.3, bpSys: 132, bpDia: 82, bpMap: 99, cuff: 2, hr: 128, rr: 30, crt: 1.8, mmc: 'wet - pink' },
        lab: { pH: 7.38, pCO2: 41, pO2: 40, Na: 146, K: 4.4, Cl: 113, iCa: 1.24, Hct: 42, WBC: 11.2, PLT: 330, ALP: 175, ALT: 72, BUN: 22, Crea: 1.1, Glu: 99, TP: 6.8, ALB: 3.2, proBNP: 620, CRP: 12 },
        imaging: {
          thoracic: { vhs: '10.4v', vlas: '2.1v (RLAD 1.6v)', trachea: '흉강 입구부 기관 내경 45% 협착(기관허탈 2기)', lung: '폐 전이 결절 없음, 경도 기관지 패턴', extra: '삽관 시 기관 자극 최소화 필요' },
          abdominal: '간·비장 특이 전이 소견 없음', ultrasound: null
        },
        trueAsa: 3, trueEmergency: false, truePrognosis: 'Fair'
      },
      {
        species: 'dog', name: '해피', breed: '코커 스패니얼', age: '12세', weight: 11.4, sex: '미중성화 암컷 (IF)',
        chiefComplaint: '3일간 다갈·무기력 및 외음부 농성 분비물(자궁축농증 의심)',
        ownerClue: '마지막 발정 5주 전. 3일 전부터 물만 많이 마시고 어제부터 사료 거부 및 구토 2회. 수술 이력 없음.',
        history: [
          { key: 'hx_surg', label: '수술 이력', text: '없음 (미중성화)', keywords: ['수술', '마취', '이전', '이력'] },
          { key: 'hx_allergy', label: '알러지', text: '특이 알러지 없음', keywords: ['알러지', '과민', '부작용'] },
          { key: 'hx_med', label: '병력 / 증상', text: '발정 5주 후 농성 질분비물, 다음다뇨, 무기력, 구토 2회', keywords: ['발정', '분비물', '자궁', '구토', '물', '증상', '병력', '약'] },
          { key: 'hx_fast', label: '금식 상태', text: '24시간 자발적 절식', keywords: ['금식', '밥', '먹', '특이'] }
        ],
        pe: { bt: 39.6, bpSys: 96, bpDia: 58, bpMap: 71, cuff: 4, hr: 148, rr: 36, crt: 2.5, mmc: 'dry - dark red (injected)' },
        lab: { pH: 7.28, pCO2: 33, pO2: 39, Na: 140, K: 3.7, Cl: 106, iCa: 1.15, Hct: 35, WBC: 31.4, neuP: 86, lymP: 6, PLT: 192, ALP: 265, ALT: 74, BUN: 38, Crea: 1.9, Glu: 82, TP: 7.6, ALB: 2.4, CRP: 145 },
        imaging: {
          thoracic: { vhs: '10.1v', vlas: '2.0v (RLAD 1.5v)', trachea: '정상', lung: '특이 폐침윤 없음', extra: '특이사항 없음' },
          abdominal: '중후복부 관상 연부조직 음영 현저히 확장(자궁 확장), 장관 등쪽 변위',
          ultrasound: '복부 초음파: 액체 저류로 팽만된 자궁각(직경 3.4cm), 자궁축농증 확진'
        },
        trueAsa: 4, trueEmergency: true, truePrognosis: 'Guarded'
      }
    ],
    cat: [
      {
        species: 'cat', name: '호두', breed: '아메리칸 숏헤어', age: '4세', weight: 4.7, sex: '중성화 수컷 (CM)',
        chiefComplaint: '끈 모양 이물(선형 이물) 섭취 의심 및 반복 구토로 개복술 예정',
        ownerClue: '어젯밤 실타래를 씹는 걸 본 뒤 오늘 새벽부터 5회 구토. 물도 마시면 바로 토함. 과거 수술은 중성화만 있음.',
        history: [
          { key: 'hx_surg', label: '수술 이력', text: '1세 중성화 수술', keywords: ['수술', '마취', '이전', '이력'] },
          { key: 'hx_allergy', label: '알러지', text: '알려진 알러지 없음', keywords: ['알러지', '과민', '부작용'] },
          { key: 'hx_med', label: '병력 / 증상', text: '실(선형 이물) 섭취 의심, 새벽부터 구토 5회, 복통', keywords: ['이물', '실', '구토', '토', '증상', '병력', '약'] },
          { key: 'hx_fast', label: '금식 상태', text: '14시간 이상 섭취 불가 (구토 지속)', keywords: ['금식', '밥', '먹', '물', '특이'] }
        ],
        pe: { bt: 38.1, bpSys: 104, bpDia: 64, bpMap: 77, cuff: 2, hr: 194, rr: 34, crt: 2.3, mmc: 'dry - pink (설하 이물 미확인, 복부 촉진 시 통증)' },
        lab: { pH: 7.46, pCO2: 43, pO2: 41, Na: 145, K: 3.1, Cl: 104, iCa: 1.18, Hct: 46, WBC: 15.8, PLT: 280, ALP: 52, ALT: 68, BUN: 42, Crea: 1.9, Glu: 156, TP: 8.1, ALB: 3.7, SAA: 22 },
        imaging: {
          thoracic: { vhs: '7.5v', vlas: '1.6v (RLAD 1.2v)', trachea: '정상', lung: '정상 폐야', extra: '특이사항 없음' },
          abdominal: '소장 주름짐(Plication) 및 쉼표 모양 가스 음영(선형 이물 강력 의심)',
          ultrasound: '복부 초음파: 소장 내 고에코 선형 구조물 및 장관 주름짐, 소량 복수'
        },
        trueAsa: 3, trueEmergency: true, truePrognosis: 'Fair'
      },
      {
        species: 'cat', name: '보리', breed: '랙돌', age: '8세', weight: 5.1, sex: '중성화 수컷 (CM)',
        chiefComplaint: '좌측 상악 견치 파절 및 치주염 발치 예정',
        ownerClue: '무증상 HCM 의심으로 작년 심장검사 권유받았으나 아직 못 받음. 10시간 금식 완료. 평소 활력 양호.',
        history: [
          { key: 'hx_surg', label: '수술 이력', text: '1세 중성화 수술', keywords: ['수술', '마취', '이전', '이력'] },
          { key: 'hx_allergy', label: '알러지', text: '특이 알러지 없음', keywords: ['알러지', '과민', '부작용'] },
          { key: 'hx_med', label: '병력 / 특이사항', text: '작년 건강검진 시 심잡음 청진 이력(정밀 심초음파 미실시), 복용약 없음', keywords: ['심장', '잡음', '병력', '약', '복용', '질환', '증상'] },
          { key: 'hx_fast', label: '금식 상태', text: '10시간 금식 완료', keywords: ['금식', '밥', '먹', '특이'] }
        ],
        pe: { bt: 38.4, bpSys: 142, bpDia: 88, bpMap: 106, cuff: 2, hr: 192, rr: 30, crt: 1.5, mmc: 'wet - pink (흉골연 수축기 잡음 2/6)' },
        lab: { pH: 7.36, pCO2: 36, pO2: 42, Na: 151, K: 4.3, Cl: 120, iCa: 1.23, Hct: 38, WBC: 10.2, PLT: 270, ALP: 44, ALT: 52, BUN: 25, Crea: 1.5, Glu: 142, TP: 7.0, ALB: 3.3, proBNP: 285, SAA: 2.1 },
        imaging: {
          thoracic: { vhs: '8.1v (경도 심비대)', vlas: '1.9v (RLAD 1.4v)', trachea: '정상', lung: '폐수종·흉수 없음', extra: '무증상 HCM B1 의심' },
          abdominal: null,
          ultrasound: '심장 초음파: IVSd 6.3 mm, LVPWd 6.1 mm, LA/Ao 1.38 (무증상 HCM Stage B1 확진)'
        },
        trueAsa: 3, trueEmergency: false, truePrognosis: 'Fair'
      }
    ]
  };

  const PERSONALITIES = ['indifferent', 'optimistic', 'neutral', 'anxious', 'urgent'];

  function cloneCase(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getFixedCase(stageId) {
    const base = FIXED_CASES[stageId] || FIXED_CASES.tutorial;
    return cloneCase(base);
  }

  async function generatePracticeCase(species, recentNames = []) {
    const sp = species === 'cat' ? 'cat' : 'dog';
    const randPers = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
    const randLv = 1 + Math.floor(Math.random() * 5);

    try {
      const resp = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({
          task: 'generate_case',
          phase: 'chapter1',
          species: sp,
          recentCases: recentNames
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const c = data && data.caseData;
        if (c && c.name && c.pe && c.chiefComplaint) {
          c.id = sp === 'cat' ? 'practice_cat' : 'practice_dog';
          c.species = sp;
          c.ownerPersonality = randPers;
          c.ownerLevel = randLv;
          c.history = Array.isArray(c.history) && c.history.length ? c.history : [
            { key: 'hx_surg', label: '수술 이력', text: '이전 특이 수술 이력 없음', keywords: ['수술', '마취', '이전', '이력'] },
            { key: 'hx_allergy', label: '알러지', text: '알려진 알러지 없음', keywords: ['알러지', '과민', '부작용'] },
            { key: 'hx_med', label: '병력 / 금식', text: c.ownerClue || '금식 및 기저질환 문진 확인', keywords: ['약', '복용', '금식', '밥', '증상', '병력'] }
          ];
          c.ownerGreeting = `안녕하세요 선생님, ${c.name} 진료와 마취 전 검사 받으러 왔습니다.`;
          c.trueAsa = cl(Number(c.trueAsa) || 2, 1, 5);
          c.trueEmergency = Boolean(c.trueEmergency);
          if (!['Good', 'Fair', 'Guarded', 'Poor', 'Grave'].includes(c.truePrognosis)) {
            c.truePrognosis = c.trueAsa <= 2 ? 'Good' : c.trueAsa === 3 ? 'Fair' : c.trueAsa === 4 ? 'Poor' : 'Grave';
          }
          return c;
        }
      }
    } catch {}

    const pool = PRACTICE_FALLBACK[sp] || PRACTICE_FALLBACK.dog;
    const pick = cloneCase(pool[Math.floor(Math.random() * pool.length)]);
    pick.id = sp === 'cat' ? 'practice_cat' : 'practice_dog';
    pick.ownerPersonality = randPers;
    pick.ownerLevel = randLv;
    pick.ownerGreeting = `안녕하세요 선생님, ${pick.name} 마취 전 검사 받으러 왔습니다.`;
    return pick;
  }

  /* Detect which Signalment items (chiefComplaint + history[]) match the vet's question or owner reply */
  function detectDiscoveredKeys(caseObj, vetText, ownerText = '') {
    const combined = `${vetText || ''} ${ownerText || ''}`.toLowerCase();
    const hits = [];

    if (/주호소|어디|왜|무슨|오셨|내원|수술|시술|증상|아파|불편|문제|안녕/.test(combined)) {
      hits.push('chiefComplaint');
    }
    (caseObj.history || []).forEach((h) => {
      const kws = Array.isArray(h.keywords) ? h.keywords : [];
      if (kws.some((kw) => combined.includes(String(kw).toLowerCase()))) {
        hits.push(h.key);
      }
    });
    return hits;
  }

  /* Offline Owner Reply (respects hidden personality & knowledge level without exposing them) */
  function buildOfflineOwnerReply(caseObj, question) {
    const q = String(question || '').trim().toLowerCase();
    const pers = caseObj.ownerPersonality || 'neutral';
    const lv = Number(caseObj.ownerLevel || 2);

    const matchedHistory = (caseObj.history || []).filter((h) =>
      (h.keywords || []).some((kw) => q.includes(String(kw).toLowerCase()))
    );

    let core = '';
    if (matchedHistory.length) {
      core = matchedHistory.map((h) => h.text).join('. ');
    } else if (/어디|왜|무슨|오셨|내원|수술|증상|주호소/.test(q)) {
      core = `${caseObj.chiefComplaint} 때문에 왔어요.`;
    } else if (/안녕|반갑|어떻게/.test(q)) {
      core = `${caseObj.chiefComplaint} 관련해서 검사 받으려고 왔습니다.`;
    } else {
      core = caseObj.ownerClue || `${caseObj.chiefComplaint} 외에 특별히 기억나는 건 잘 모르겠어요.`;
    }

    if (lv <= 1) {
      core = core.replace(/\b(MMVD|HCM|GDV|FLUTD|FORL|MPL|CKD|IRIS|OHE|BID)\b/gi, '병원에서 말한 증상');
    }

    if (pers === 'indifferent') return `${core} 바빠서 자세히는 못 봤는데 알아서 잘 봐주시겠죠.`;
    if (pers === 'optimistic') return `${core} 우리 ${caseObj.name} 원래 튼튼해서 잘 이겨낼 거예요!`;
    if (pers === 'anxious') return `${core} 혹시 마취 중에 큰 문제 생기는 건 아니겠죠? 너무 걱정돼요.`;
    if (pers === 'urgent') return `${core} 선생님, 지금 상태 많이 안 좋은 건가요? 빨리 검사하고 조치해 주세요!`;
    return `${core} 추가로 확인하실 부분이 있으면 말씀해 주세요.`;
  }

  window.Beta11Ch1Data = {
    REF,
    buildLabPanel,
    getFixedCase,
    generatePracticeCase,
    detectDiscoveredKeys,
    buildOfflineOwnerReply
  };
})();
