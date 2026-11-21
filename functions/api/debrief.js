// Cloudflare Pages Function: Unified Gemini AI Backend (/api/ai & /api/debrief)
// Required Cloudflare Pages Environment Variable: GEMINI_API_KEY

const CORS_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function jsonRes(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: CORS_HEADERS });
}

export async function onRequestOptions() {
  return new Response('', { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env && env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonRes({ error: 'Cloudflare Pages 환경변수(GEMINI_API_KEY)가 설정되지 않았습니다.' }, 503);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const task = body.task || 'debrief';
    let prompt = '';
    let expectJson = false;

    if (task === 'generate_case') {
      expectJson = true;
      prompt = `수의 마취 교육용 랜덤 신규 환자 케이스 1건을 JSON 객체로만 출력하세요(마크다운 백틱 금지).
축종 참고: ${body.species || 'dog'}. 연령·질환에 맞는 현실적 혈액검사 이상(고칼륨, 저혈당, 빈혈, 저알부민, 담낭파열 고ALP, 신부전, 패혈증, 심부전 등)을 1개 이상 포함하되 비현실적인 극단값은 금지합니다.
lab.panelTier는 어린 건강 환자는 "chemi7", 노령·복합질환은 "full", 초응급 채혈 불가는 "emerg_none" 중 하나를 선택하세요.
키: {"title":"짧은 제목","species":"dog 또는 cat","asa":"ASA III","summary":"한 줄 환자 요약","target":"핵심 처치 목표","caution":"주의사항","baseHR":110,"baseMAP":68,"baseBT":36.8,"iso":1.3,"lab":{"panelTier":"full","HCT":32,"ALB":2.2,"Na":145,"K":6.8,"Cl":111,"iCa":1.12,"Glu":64,"pH":7.24,"ALP":420,"ALT":180,"BUN":48,"Crea":2.8,"WBC":19.5,"PLT":170,"lactate":3.4}}`;
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
      return jsonRes({ caseData }, 200);
    }
    return jsonRes({ text: rawText, analysis: rawText }, 200);
  } catch (err) {
    return jsonRes({ error: `AI 분석 처리 오류: ${err && err.message ? err.message : '알 수 없는 오류'}` }, 500);
  }
}
