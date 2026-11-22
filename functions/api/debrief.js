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
  const customBrief = body.customBrief ? String(body.customBrief).trim() : '';
  if (customBrief) {
    return `당신은 수의 마취과 전문의입니다. 사용자가 직접 입력한 아래 환자 브리핑을 충실히 반영하여 수의 마취 시뮬레이션용 환자 케이스 1건을 JSON 객체로만 출력하세요(마크다운 백틱 금지).
사용자 환자 브리핑: "${customBrief}"
필수 규칙:
1) 사용자가 입력한 품종, 연령, 체중, 수술/시술, 기저질환, 혈액검사 수치나 증상을 빠짐없이 반영하세요.
2) 사용자가 언급하지 않은 나머지 바이탈(baseHR, baseMAP, baseBT, iso), ASA 등급, 혈액검사 수치들은 이 환자의 연령·질환에 맞게 임상적으로 현실적인 값으로 채우되 비현실적 극단값은 금지합니다.
3) lab.panelTier는 어린 건강 환자는 "chemi7", 노령·복합질환은 "full", 초응급 채혈 불가는 "emerg_none" 중 하나를 선택하세요.
4) species 값은 반드시 "dog" 또는 "cat" 중 하나만 넣으세요.
출력 JSON 스키마:
{"title":"품종+수술명 짧은 제목","species":"dog 또는 cat","asa":"ASA 등급(예: ASA II~IV-E)","summary":"연령·체중·품종·수술·핵심 이상소견 한 줄 요약","target":"핵심 마취 처치 목표","caution":"주의사항 및 금기 약물","baseHR":숫자,"baseMAP":숫자,"baseBT":숫자,"iso":숫자,"lab":{"panelTier":"full|chemi7|emerg_none","HCT":숫자,"ALB":숫자,"Na":숫자,"K":숫자,"Cl":숫자,"iCa":숫자,"Glu":숫자,"pH":숫자,"ALP":숫자,"ALT":숫자,"BUN":숫자,"Crea":숫자,"WBC":숫자,"PLT":숫자,"lactate":숫자}}`;
  }
  const recentList = Array.isArray(body.recentCases) && body.recentCases.length
    ? body.recentCases.join(' / ')
    : '없음';
  const seedHint = body.seedHint || body.species || `랜덤 시드 #${Math.floor(100000 + Math.random() * 900000)}`;
  return `당신은 수의 마취과 전문의입니다. 아래 랜덤 출제 조건에 맞춰 매번 완전히 다른 독창적인 수의 마취 교육용 환자 케이스 1건을 JSON 객체로만 출력하세요(마크다운 백틱 금지).
출제 조건: ${seedHint}
최근 출제되어 반드시 피해야 할 케이스(동일 품종·수술·병명 반복 금지): ${recentList}
필수 규칙:
1) 품종, 연령, 체중, 수술/시술, 기저질환을 위 출제 조건에 맞춰 구체적이고 현실적으로 설정하세요.
2) 연령·질환에 맞는 현실적 혈액검사 이상(고칼륨, 저혈당, 빈혈, 저알부민, 담낭파열 초고ALP, 신부전 고BUN/Crea, 패혈증 고Lactate/WBC, 쿠싱, 애디슨 등)을 자연스럽게 반영하되 비현실적 극단값은 금지합니다.
3) lab.panelTier는 어린 건강 환자는 "chemi7", 노령·복합질환은 "full", 초응급 채혈 불가는 "emerg_none" 중 하나를 선택하세요.
4) species 값은 반드시 "dog" 또는 "cat" 중 하나만 넣으세요.
출력 JSON 스키마(수치는 반드시 이 환자 상태에 맞게 새로 생성):
{"title":"품종+수술명 짧은 제목","species":"dog 또는 cat","asa":"ASA 등급(예: ASA II~IV-E)","summary":"연령·체중·품종·수술·핵심 이상소견 한 줄 요약","target":"핵심 마취 처치 목표","caution":"주의사항 및 금기 약물","baseHR":숫자,"baseMAP":숫자,"baseBT":숫자,"iso":숫자,"lab":{"panelTier":"full|chemi7|emerg_none","HCT":숫자,"ALB":숫자,"Na":숫자,"K":숫자,"Cl":숫자,"iCa":숫자,"Glu":숫자,"pH":숫자,"ALP":숫자,"ALT":숫자,"BUN":숫자,"Crea":숫자,"WBC":숫자,"PLT":숫자,"lactate":숫자}}`;
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
      const abortRule = `중요 규칙: 만약 수의사의 발언에 욕설, 비속어, 모욕, 위협, 성희롱, 심한 무례·폭언 등 정상적인 진료나 상담을 이어갈 수 없는 부적절한 내용이 포함되어 있다면, 응답 맨 앞에 반드시 "[ABORT] "를 붙이고 보호자가 강하게 항의하며 진료/상담을 중단하고 나가는 1~2문장 반응을 작성하세요.`;
      if (body.role === 'owner_preop') {
        prompt = `당신은 동물병원 보호자입니다. ${abortRule} 정상적인 문진이라면 수의사의 질문("${body.question}")에 자연스러운 한국어 2문장으로 답하세요. 환자 정보: ${body.caseDesc}. 반드시 반영할 숨은 단서: ${body.clue}`;
      } else {
        prompt = `당신은 수술을 마친 반려동물(${body.species}, ${body.caseName}) 보호자입니다. ${abortRule} 정상적인 안내라면 수의사의 퇴원 안내("${body.vetAdvice}")를 듣고 이해한 내용과 추가 궁금증 1가지를 한국어 2문장으로 자연스럽게 답하세요.`;
      }
    } else if (task === 'soap_record') {
      prompt = `아래 수의 마취 로그를 실제 동물병원 의무기록 SOAP 형식으로 한국어 10줄 이내로 간결히 정리하세요.
환자: ${body.species} / ${body.scenario}, 경과: ${body.duration}, 상태: ${body.arrested ? '심정지 - ' + body.arrestReason : '유지'}, 지표: ${JSON.stringify(body.finalVitals || {})}, 로그: ${(body.recentLogs || []).join(' | ')}`;
    } else {
      prompt = `당신은 수의 마취과 교육자입니다. 아래 로그를 보고 1) 핵심 악화 원인 2) 놓친 시점·아쉬운 처치 3) 권장 처치 순서를 한국어 350자 내외로 작성하세요.
환자: ${body.species} / ${body.scenario}, 상태: ${body.arrestReason}, 지표: ${JSON.stringify(body.finalVitals || {})}, 로그: ${(body.recentLogs || []).join(' | ')}`;
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
      return jsonRes({ caseData }, 200);
    }
    return jsonRes({ text: rawText, analysis: rawText }, 200);
  } catch (err) {
    return jsonRes({ error: `AI 분석 처리 오류: ${err && err.message ? err.message : '알 수 없는 오류'}` }, 500);
  }
}
