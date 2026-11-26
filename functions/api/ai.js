// Cloudflare Pages Function: Unified Gemini AI Backend (/api/ai & /api/debrief)
// Required Cloudflare Pages Environment Variable (Secret): GEMINI_API_KEY

const CORS_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function jsonRes(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: CORS_HEADERS });
}

async function parseJsonBody(req) {
  try {
    const raw = await req.text();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function buildGenerateCasePrompt(body) {
  if (body.phase === 'chapter1') {
    const sp = String(body.species || '').toLowerCase().includes('cat') ? 'cat' : 'dog';
    const spKr = sp === 'cat' ? '고양이' : '개';
    const recentList = Array.isArray(body.recentCases) && body.recentCases.length
      ? body.recentCases.join(' / ')
      : '없음';
    return `당신은 수의 마취과 전문의입니다. 마취 전 검사 시뮬레이터(Chapter 1) 실전 단계용 ${spKr}(${sp}) 환자 케이스 1건을 JSON 객체로만 출력하세요(마크다운 백틱 금지).
최근 출제되어 피해야 할 케이스: ${recentList}
필수 규칙:
1) species는 반드시 "${sp}"로 고정하고 축종·품종·연령에 맞는 의학적으로 현실적인 질환(무증상~응급 중 랜덤)을 설정하세요.
2) history 배열에는 보호자 문진으로 확인할 3~4개 항목(수술 이력, 알러지, 복용약/기저질환, 금식/최근 증상 등)을 넣고 각 항목마다 keywords 배열(한국어 검색 키워드 3~5개)을 포함하세요.
3) trueAsa는 1~5 정수, trueEmergency는 boolean, truePrognosis는 "Good"|"Fair"|"Guarded"|"Poor"|"Grave" 중 하나입니다.
출력 JSON 스키마:
{"species":"${sp}","name":"환자이름","breed":"품종","age":"예: 7세","weight":숫자,"sex":"예: 중성화 수컷 (CM)","chiefComplaint":"주호소 한 줄","history":[{"key":"hx_surg","label":"수술 이력","text":"내용","keywords":["수술","마취","이전"]},{"key":"hx_allergy","label":"알러지","text":"내용","keywords":["알러지","과민","부작용"]},{"key":"hx_med","label":"복용약/병력","text":"내용","keywords":["약","복용","질환","병력"]},{"key":"hx_fast","label":"금식/최근 증상","text":"내용","keywords":["금식","밥","구토","식욕","증상"]}],"ownerClue":"보호자가 알고 있는 핵심 단서 요약","pe":{"bt":숫자,"bpSys":숫자,"bpDia":숫자,"bpMap":숫자,"cuff":숫자,"hr":숫자,"rr":숫자,"crt":숫자,"mmc":"예: wet - pink","auscHeart":"예: 심잡음 없음 (정상 심음)","auscLung":"예: 정상 폐포음 (수포음·천명음 없음)","auscBowel":"예: 정상 복명음"},"lab":{"pH":숫자,"pCO2":숫자,"pO2":숫자,"Na":숫자,"K":숫자,"Cl":숫자,"iCa":숫자,"Hct":숫자,"WBC":숫자,"PLT":숫자,"ALP":숫자,"ALT":숫자,"AST":숫자,"GGT":숫자,"BUN":숫자,"Crea":숫자,"Phos":숫자,"Ca":숫자,"TG":숫자,"Tchol":숫자,"Glu":숫자,"TP":숫자,"ALB":숫자,"Mg":숫자,"proBNP":숫자,"T4":숫자,"Cortisol":숫자,"SDMA":숫자,"CRP":숫자,"cPL":숫자,"SAA":숫자,"fPL":숫자},"imaging":{"thoracic":{"vhs":"예: 9.8v","vlas":"예: 2.1v (RLAD 1.6v)","trachea":"예: 정상 주행 및 내경 유지","lung":"예: 특이 침윤 없음 (정상 폐야)","extra":"추가 소견 또는 특이사항 없음"},"abdominal":null,"ultrasound":null},"trueAsa":숫자,"trueEmergency":false,"truePrognosis":"Good|Fair|Guarded|Poor|Grave"}`;
  }
  const customBrief = body.customBrief ? String(body.customBrief).trim() : '';
  if (customBrief) {
    return `당신은 수의 마취과 전문의입니다. 사용자가 직접 입력한 아래 환자 브리핑을 충실히 반영하여 수의 마취 시뮬레이션용 환자 케이스 1건을 JSON 객체로만 출력하세요(마크다운 백틱 금지).
사용자 환자 브리핑: "${customBrief}"
필수 규칙:
1) 사용자가 입력한 품종, 연령, 체중, 수술/시술, 기저질환, 혈액검사 수치나 증상을 빠짐없이 반영하세요.
2) 사용자가 언급하지 않은 나머지 바이탈(baseHR, baseMAP, baseBT, iso), ASA 등급, 혈액검사 수치들은 이 환자의 연령·질환에 맞게 임상적으로 현실적인 값으로 채우되 비현실적 극단값은 금지합니다.
3) lab.panelTier는 어린 건강 환자는 "chemi7", 노령·복합질환은 "full", 초응급 채혈 불가는 "emerg_none" 중 하나를 선택하세요.
4) species 값은 반드시 "dog" 또는 "cat" 중 하나만 넣고, weight 숫자(kg)와 summary 안의 체중(kg)을 반드시 동일하게 맞추세요.
출력 JSON 스키마:
{"title":"품종+수술명 짧은 제목","species":"dog 또는 cat","breed":"품종명","weight":숫자,"asa":"ASA 등급(예: ASA II~IV-E)","summary":"연령·체중·품종·수술·핵심 이상소견 한 줄 요약","target":"핵심 마취 처치 목표","caution":"주의사항 및 금기 약물","baseHR":숫자,"baseMAP":숫자,"baseBT":숫자,"iso":숫자,"lab":{"panelTier":"full|chemi7|emerg_none","HCT":숫자,"ALB":숫자,"Na":숫자,"K":숫자,"Cl":숫자,"iCa":숫자,"Glu":숫자,"pH":숫자,"pCO2":숫자,"ALP":숫자,"ALT":숫자,"BUN":숫자,"Crea":숫자,"WBC":숫자,"PLT":숫자,"lactate":숫자}}`;
  }
  const recentList = Array.isArray(body.recentCases) && body.recentCases.length
    ? body.recentCases.join(' / ')
    : '없음';
  const seedHint = body.seedHint || body.species || `랜덤 시드 #${Math.floor(100000 + Math.random() * 900000)}`;
  return `당신은 수의 마취과 전문의입니다. 아래 랜덤 출제 조건에 맞춰 매번 완전히 다른 독창적인 수의 마취 교육용 환자 케이스 1건을 JSON 객체로만 출력하세요(마크다운 백틱 금지).
출제 조건: ${seedHint}
최근 출제되어 반드시 피해야 할 케이스(동일 품종·수술·병명 반복 금지): ${recentList}
필수 규칙:
1) 품종, 연령, 체중, 수술/시술, 기저질환을 위 출제 조건에 맞춰 설정하되 축종·품종·연령별 의학적 적합성을 엄격히 지키세요(예: 고양이에 MMVD·GDV·TPLO·쿠싱 금지, 개에 고양이 HCM·PU·지방간 금지, 1~2세 어린 환자에 노령성 종양·MMVD·담낭점액종 금지).
2) 연령·질환에 맞는 현실적 혈액검사 이상(고칼륨, 저혈당, 빈혈, 저알부민, 담낭파열 초고ALP, 신부전 고BUN/Crea, 패혈증 고Lactate/WBC, 쿠싱, 애디슨 등)을 자연스럽게 반영하되 비현실적 극단값은 금지합니다.
3) lab.panelTier는 어린 건강 환자는 "chemi7", 노령·복합질환은 "full", 초응급 채혈 불가는 "emerg_none" 중 하나를 선택하세요.
4) species 값은 반드시 "dog" 또는 "cat" 중 하나만 넣고, weight 숫자(kg)와 summary 안의 체중(kg)을 반드시 동일하게 맞추세요.
출력 JSON 스키마(수치는 반드시 이 환자 상태에 맞게 새로 생성):
{"title":"품종+수술명 짧은 제목","species":"dog 또는 cat","breed":"품종명","weight":숫자,"asa":"ASA 등급(예: ASA II~IV-E)","summary":"연령·체중·품종·수술·핵심 이상소견 한 줄 요약","target":"핵심 마취 처치 목표","caution":"주의사항 및 금기 약물","baseHR":숫자,"baseMAP":숫자,"baseBT":숫자,"iso":숫자,"lab":{"panelTier":"full|chemi7|emerg_none","HCT":숫자,"ALB":숫자,"Na":숫자,"K":숫자,"Cl":숫자,"iCa":숫자,"Glu":숫자,"pH":숫자,"pCO2":숫자,"ALP":숫자,"ALT":숫자,"BUN":숫자,"Crea":숫자,"WBC":숫자,"PLT":숫자,"lactate":숫자}}`;
}

export async function onRequestOptions() {
  return new Response('', { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env && env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonRes({ error: 'Cloudflare Pages 환경변수에 GEMINI_API_KEY가 설정되지 않았습니다.' }, 503);
  }

  try {
    const body = await parseJsonBody(request);
    const task = body.task || 'debrief';
    let prompt = '';
    let expectJson = false;

    if (task === 'generate_case') {
      expectJson = true;
      prompt = buildGenerateCasePrompt(body);
    } else if (task === 'review_drugs') {
      prompt = `수의 마취과 전문의로서 ${body.species} '${body.caseName}' 환자에게 전처치(${body.premed}) + 유도제(${body.induction}) 조합이 적절한지 한국어로 2문장 이내로 핵심 장단점과 위험 포인트만 코멘트하세요.`;
    } else if (task === 'tutor_hint') {
      prompt = `수의 마취 초급 교육 튜터입니다. 정답을 직접 말하지 말고 감별진단 힌트만 한국어로 3줄 이내로 주세요.
환자: ${body.species} / ${body.scenario}, 현재 바이탈: ${JSON.stringify(body.vitals || {})}, 최근 로그: ${(body.recentLogs || []).join(' | ')}, 학생 질문: ${body.question}`;
    } else if (task === 'roleplay') {
      const abortRule = `중요 규칙: 만약 수의사의 발언에 욕설, 비속어, 모욕, 위협, 성희롱, 심한 무례·폭언 등 정상적인 진료나 상담을 이어갈 수 없는 부적절한 내용이 포함되어 있다면, 응답 맨 앞에 반드시 "[ABORT] "를 붙이고 보호자가 강하게 항의하며 진료/상담을 중단하고 나가는 1~2문장 반응을 작성하세요. (단순히 답답하거나 엉뚱한 질문에는 [ABORT]를 붙이지 말고 현실적인 짜증·당황·불신으로 반응하세요.)`;
      const lv = Math.max(1, Math.min(5, Number(body.knowledgeLevel) || 2));
      const persRaw = String(body.ownerPersonality || 'neutral').toLowerCase();
      const personalityMap = {
        indifferent: '무관심: 바쁘거나 귀찮아하며 대충 넘기려는 태도. 집에서의 세부 증상·금식·복약 여부를 잘 기억 못 하거나 대수롭지 않게 말하며("알아서 잘 해주시겠죠", "바빠서 잘 못 봤어요") 짧게 반응함.',
        optimistic: '낙관적: 긍정적이고 수의사를 신뢰하는 태도. 마취 위험을 들어도 "우리 애는 튼튼해서 잘 이겨낼 거예요!"처럼 밝고 협조적이지만, 주의사항을 가볍게 넘기려 할 수 있음.',
        neutral: '중립: 차분하고 객관적이며 사실 위주로 묻고 답하는 균형 잡힌 태도.',
        anxious: '걱정: 불안이 크고 혹시 모를 마취 합병증·후유증을 거듭 확인하며 안심을 구함. 실제 바이탈·혈검이 양호하고 수의사가 차분히 설명해 주면 마음이 놓임.',
        urgent: '다급: 아이 상태가 걱정되어 마음이 매우 급하고 초조한 태도. 말이 빠르고 결론과 안전 여부를 재촉하며, 수의사가 핵심을 신속하고 분명하게 짚어 주기를 강하게 원함.',
        negative: '부정적: 회의적이고 방어적·비판적인 태도. 마취 부작용·수술 필요성·검사 결과에 의구심이 강해 "괜히 했다가 잘못되는 거 아니에요?", "확실한 거 맞나요?"처럼 날카롭게 반문함(수의사가 진지하고 객관적인 근거로 설명하면 점차 누그러짐).'
      };
      const persDesc = personalityMap[persRaw] || personalityMap.neutral;
      const knowledgeMap = {
        1: 'Lv.1 (완전 초보): 수의학 지식이 거의 없습니다. 약물 성분명·용량·투여속도·혈액검사 수치·의학 약어(MMVD, HCM, DKA, GDV, BOAS, K+, ALP 등)를 전혀 알지 못하며 직접 말하지 않습니다. 전문 용어로 물으면 못 알아듣고 "그게 무슨 말이에요? 쉽게 말씀해 주세요"라고 되묻고, 집에서 본 겉증상과 막연한 기억("무슨 알약", "링거랑 주사 맞았대요")만 일상어로 말합니다.',
        2: 'Lv.2 (일반 보호자): 대략적인 병명("심장이 약하대요", "요도가 막혔대요")과 약의 대략적 목적("이뇨제 같은 거") 정도는 어렴풋이 알지만, 정확한 약품명·용량·혈액검사 수치는 잘 기억하지 못합니다. 쉬운 일상어로 대화합니다.',
        3: 'Lv.3 (관심 많은 보호자): 이전 병원에서 들은 진단명과 평소 먹이는 핵심 약 이름 정도는 메모해 두어 알고 있습니다. 다만 정확한 용량(mg/kg), 수액 속도, 세부 혈검 수치 해석이나 마취 프로토콜 원리는 잘 몰라 수의사에게 물어봅니다.',
        4: 'Lv.4 (숙련·만성질환 보호자): 오랜 관리와 공부로 진단명, 복용 약물명·투여 횟수/대략 용량, 주요 혈액검사 이상(칼륨·간수치·빈혈·혈당 등)과 이전 처치 내용을 꽤 정확히 이해하고 있습니다. 마취 위험·모니터링·집에서의 응급 대처법을 구체적이고 꼼꼼하게 묻습니다.',
        5: 'Lv.5 (준전문가·의료/수의 관련 종사자): 진단명, 이전 처치·약물명·용량·속도, 주요 혈액검사 수치와 그에 따른 처치 원리까지 매우 높은 이해도를 보입니다. 전문 용어를 자연스럽게 이해·사용하며, 수의사의 설명이 부정확하거나 두루뭉술하면 날카롭게 되묻습니다.'
      };
      const sevRaw = String(body.severity || '').toLowerCase();
      const asaStr = String(body.asa || '');
      let sevLevel = sevRaw;
      if (!sevLevel) {
        if (/IV|V|-E|응급|쇼크|파열|고칼륨|폐색|심정지/i.test(asaStr + ' ' + (body.caseName || '') + ' ' + (body.caseDesc || ''))) sevLevel = 'critical';
        else if (/III|심부전|단두종|저체온|불쾌감/i.test(asaStr + ' ' + (body.caseName || '') + ' ' + (body.caseDesc || ''))) sevLevel = 'moderate';
        else sevLevel = 'low';
      }
      const emotionMap = {
        reassured: '안도·진정됨(차분하고 신뢰함): 처음에는 걱정되고 다급했으나, 실제 바이탈과 혈액검사 결과가 양호하다는 수의사의 차분한 안심 설명을 듣고 마음이 놓여 한결 부드럽고 협조적인 어조.',
        low: '경증/정기 시술(비교적 차분함): 평소 건강해 큰 패닉은 없지만 마취에 대한 소소한 긴장과 궁금증이 있는 차분한 어조.',
        moderate: '중등도/기저질환(뚜렷한 불안·걱정): 기저질환이나 합병증 때문에 걱정이 크고, 안전 여부와 과거 증상에 예민하게 반응하는 어조.',
        high: '중증/고위험(심한 불안·초조): 아이 상태가 좋지 않아 초조하고 목소리가 급하며, 수의사의 확신과 신속한 설명을 간절히 원함.',
        critical: '초응급/생명 위독(극도의 다급함·패닉 직전): 아이가 당장 잘못될까 극도로 다급하고 절박함. 한가하거나 엉뚱한 질문을 하면 초조함과 짜증을 강하게 드러냄.'
      };
      const historyArr = Array.isArray(body.chatHistory) ? body.chatHistory.slice(-14) : [];
      const historyText = historyArr.length
        ? historyArr.map((m) => `${m.sender === 'vet' ? '수의사' : '보호자'}: ${m.text}`).join('\n')
        : '(첫 대화)';
      const vitalsText = body.vitals ? JSON.stringify(body.vitals) : '정보 없음';
      const labSummaryText = body.labSummary ? String(body.labSummary) : '특이 요약 없음';
      const logsText = Array.isArray(body.recentLogs) && body.recentLogs.length ? body.recentLogs.slice(0, 8).join(' | ') : '없음';
      const realismRule = `실전 대화 규칙(필수):
1) [이전 대화 기록]을 반드시 읽고 맥락을 이어서 답하세요. 이미 말한 내용을 기계적으로 반복하지 마세요(중복 답변 금지).
2) 수의사가 방금 이미 대답한 걸 또 물어보거나, 환자 상황과 무관한 엉뚱한 말, "네/음/ㅋㅋ/몰라요" 같은 무성의한 단답, 응급 상황에서 시간을 끄는 답답한 질문을 하면 실제 보호자처럼 당황·답답함·짜증·불신을 자연스럽게 표현하세요.
3) 매번 "네 선생님 ~ 감사합니다!"처럼 판에 박힌 로봇 말투를 절대 쓰지 말고, 실제 병원 진료실/상담실 구어체로 자연스럽게 반응하세요.
4) [질문 완전 응답 규칙 — 최우선] 수의사의 질문이 길거나 여러 항목(예: 주호소, 이전 수술·마취 이력, 알러지, 복용약, 기저질환, 금식 여부, 최근 증상 등)을 한꺼번에 물었다면 절대 일부만 답하고 생략하지 마세요. 수의사가 물어본 모든 항목을 [환자 시나리오 배경]의 사실에 근거해 빠짐없이 구체적으로 답변하세요(항목이 많으면 3~6문장까지 충분히 작성). 반대로 수의사가 묻지 않은 항목은 미리 먼저 말하지 마세요.
5) [실시간 태도 변화] 처음에 걱정이나 다급함이 있었더라도, 실제 환자의 바이탈과 혈액검사 결과가 양호하고 수의사가 이를 근거로 안심·설명해 주면 억지로 계속 불안해하지 말고 실제로 안도하고 차분해진 태도로 자연스럽게 전환하세요. 반대로 실제 바이탈이나 혈액검사 이상이 뚜렷한데 무조건 괜찮다고만 하면 의구심이나 불안을 표현하세요.`;

      if (body.role === 'owner_preop') {
        prompt = `당신은 동물병원에 내원한 반려동물(${body.species}) 보호자입니다.
${abortRule}
[보호자 지식 수준] ${knowledgeMap[lv]}
[보호자 성향] ${persDesc}
[환자 경중 및 감정 상태] ${emotionMap[sevLevel] || emotionMap.moderate}
[환자 시나리오 배경] 케이스: ${body.caseName || ''} (${asaStr || 'ASA 미상'}) | 상세: ${body.caseDesc || ''} | 보호자가 알고 있는 단서: ${body.clue || ''} | 현재 바이탈: ${vitalsText} | 혈액검사 요약: ${labSummaryText}
[이전 대화 기록]
${historyText}
${realismRule}
방금 수의사가 한 말: "${body.question || ''}"
위 대화 흐름과 보호자 지식 수준(Lv.${lv})·성향·감정 상태에 맞춰, 수의사가 물어본 모든 질문 항목에 빠짐없이 정확히 답변하세요(지문·괄호 행동 묘사·이름 접두어 금지).`;
      } else {
        prompt = `당신은 수술·마취를 마친 반려동물(${body.species}, ${body.caseName || ''})의 보호자입니다.
${abortRule}
[보호자 지식 수준] ${knowledgeMap[lv]}
[보호자 성향] ${persDesc}
[환자 경중 및 감정 상태] ${emotionMap[sevLevel] || emotionMap.moderate}
[환자 회복 상태 및 처치 경과] 상세: ${body.caseDesc || ''} | 현재 바이탈/회복 상태: ${vitalsText} | 혈액검사 요약: ${labSummaryText} | 최근 처치 로그: ${logsText}
[이전 대화 기록]
${historyText}
${realismRule}
방금 수의사가 한 퇴원 안내/답변: "${body.vetAdvice || ''}"
수의사의 설명을 실제로 듣고 이해(또는 지식 수준·성향에 따라 헷갈림/의구심/낙관/추가 확인)하며, 이미 안내받은 내용을 중복 질문하지 말고 현재 환자 상태에 맞는 자연스러운 반응이나 현실적인 후속 질문 1가지를 한국어로 작성하세요(지문·괄호 행동 묘사·이름 접두어 금지).`;
      }
    } else if (task === 'soap_record') {
      if (/^chapter[1-5]$/i.test(String(body.phase || ''))) {
        prompt = `당신은 수의 마취과 전문의입니다. 아래 ${body.chapterLabel || body.phase} 시뮬레이션 기록을 실제 동물병원 의무기록 SOAP 형식으로 한국어 12줄 이내로 명확히 작성하세요(마크다운 기호 최소화).
환자: ${body.species} / ${body.scenario}, 문진/대화: ${body.chatSummary || '없음'}, 검사/처치/바이탈 요약: ${body.examSummary || '없음'}, 학생 수행/판정: ${body.studentEval || ''}, 기준: ${body.trueEval || ''}`;
      } else {
        prompt = `아래 수의 마취 로그를 실제 동물병원 의무기록 SOAP 형식으로 한국어 10줄 이내로 간결히 정리하세요.
환자: ${body.species} / ${body.scenario}, 경과: ${body.duration}, 상태: ${body.arrested ? '심정지 - ' + body.arrestReason : '유지'}, 지표: ${JSON.stringify(body.finalVitals || {})}, 로그: ${(body.recentLogs || []).join(' | ')}`;
      }
    } else {
      if (/^chapter[1-5]$/i.test(String(body.phase || ''))) {
        prompt = `당신은 수의 마취과 교육자입니다. 아래 ${body.chapterLabel || body.phase} 시뮬레이션 로그를 분석하여 1) 잘 수행한 임상 판단 2) 놓친 부분 또는 오차 원인 3) 다음 단계 임상 보완 포인트를 한국어 350자 내외로 간결히 피드백하세요.
환자: ${body.species} / ${body.scenario}, 대화/로그: ${body.chatSummary || '없음'}, 검사/처치 요약: ${body.examSummary || '없음'}, 학생 수행/판정: ${body.studentEval || ''}, 기준: ${body.trueEval || ''}`;
      } else {
        prompt = `당신은 수의 마취과 교육자입니다. 아래 로그를 보고 1) 핵심 악화 원인 2) 놓친 시점·아쉬운 처치 3) 권장 처치 순서를 한국어 350자 내외로 작성하세요.
환자: ${body.species} / ${body.scenario}, 상태: ${body.arrestReason}, 지표: ${JSON.stringify(body.finalVitals || {})}, 로그: ${(body.recentLogs || []).join(' | ')}`;
      }
    }

    const envModel = env && env.GEMINI_MODEL;
    const models = envModel ? [envModel] : ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'];

    let resp = null;
    let errText = '';
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2048 }
        })
      });
      if (resp.ok) break;
      if (resp.status === 429) {
        return jsonRes({ error: '무료 API 한도에 도달했습니다. 잠시 후 다시 시도하세요.' }, 429);
      }
      const errBody = await resp.json().catch(() => ({}));
      errText = errBody?.error?.message || `HTTP ${resp.status}`;
      if (resp.status !== 404) break;
    }

    if (!resp || !resp.ok) {
      return jsonRes({ error: `Gemini API 오류 (${resp ? resp.status : 'NET'}): ${errText}` }, 502);
    }

    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const rawText = parts.filter((p) => !p.thought && p.text).map((p) => p.text).join('').trim()
      || parts.map((p) => p.text || '').join('').trim();
    if (expectJson) {
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      const caseData = JSON.parse(cleaned);
      caseData.species = String(caseData.species || '').toLowerCase().includes('cat') ? 'cat' : 'dog';
      const wtM = String(caseData.summary || caseData.title || '').match(/(\d+(?:\.\d+)?)\s*kg/i);
      if (wtM && Number(wtM[1]) > 0.3 && Number(wtM[1]) < 120) {
        caseData.weight = Number(wtM[1]);
      } else if (!(Number(caseData.weight) > 0.3 && Number(caseData.weight) < 120)) {
        caseData.weight = caseData.species === 'cat' ? 4.2 : 8.5;
      }
      return jsonRes({ caseData }, 200);
    }
    return jsonRes({ text: rawText, analysis: rawText }, 200);
  } catch (err) {
    return jsonRes({ error: `AI 분석 처리 오류: ${err && err.message ? err.message : '알 수 없는 오류'}` }, 500);
  }
}
