// Netlify Serverless Function: Unified Gemini AI Backend for 3-Phase Veterinary Anesthesia Suite
// Tasks: debrief | generate_case | review_drugs | tutor_hint | roleplay | soap_record
// Required Netlify Environment Variable: GEMINI_API_KEY

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Netlify 환경변수에 GEMINI_API_KEY가 설정되지 않았습니다.' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const task = body.task || 'debrief';
    let prompt = '';
    let expectJson = false;

    if (task === 'generate_case') {
      expectJson = true;
      prompt = `수의 마취 교육용 랜덤 신규 환자 케이스 1건을 JSON 객체로만 출력하세요(마크다운 백틱 금지).
축종 참고: ${body.species || 'dog'}. 혈액검사 이상(고칼륨, 저혈당, 빈혈, 저알부민, 신부전 등)을 1개 이상 포함하세요.
키: {"title":"짧은 제목","species":"dog 또는 cat","asa":"ASA III","summary":"한 줄 환자 요약","target":"핵심 처치 목표","caution":"주의사항","baseHR":110,"baseMAP":68,"baseBT":36.8,"iso":1.3}`;
    } else if (task === 'review_drugs') {
      prompt = `수의 마취과 전문의로서 ${body.species} '${body.caseName}' 환자에게 전처치(${body.premed}) + 유도제(${body.induction}) 조합이 적절한지 한국어로 2문장 이내로 핵심 장단점과 위험 포인트만 코멘트하세요.`;
    } else if (task === 'tutor_hint') {
      prompt = `수의 마취 초급 교육 튜터입니다. 정답을 직접 말하지 말고 감별진단 힌트만 한국어로 3줄 이내로 주세요.
환자: ${body.species} / ${body.scenario}, 현재 바이탈: ${JSON.stringify(body.vitals || {})}, 최근 로그: ${(body.recentLogs || []).join(' | ')}, 학생 질문: ${body.question}`;
    } else if (task === 'roleplay') {
      if (body.role === 'owner_preop') {
        prompt = `당신은 동물병원 보호자입니다. 수의사의 질문("${body.question}")에 자연스러운 한국어 2문장으로 답하세요. 환자 정보: ${body.caseDesc}. 반드시 반영할 숨은 단서: ${body.clue}`;
      } else {
        prompt = `당신은 수술을 마친 반려동물(${body.species}, ${body.caseName}) 보호자입니다. 수의사의 퇴원 안내("${body.vetAdvice}")를 듣고 이해한 내용과 추가 궁금증 1가지를 한국어 2문장으로 자연스럽게 답하세요.`;
      }
    } else if (task === 'soap_record') {
      prompt = `아래 수의 마취 로그를 실제 동물병원 의무기록 SOAP 형식으로 한국어 10줄 이내로 간결히 정리하세요.
환자: ${body.species} / ${body.scenario}, 경과: ${body.duration}, 상태: ${body.arrested ? '심정지 - ' + body.arrestReason : '유지'}, 지표: ${JSON.stringify(body.finalVitals || {})}, 로그: ${(body.recentLogs || []).join(' | ')}`;
    } else {
      prompt = `당신은 수의 마취과 교육자입니다. 아래 로그를 보고 1) 핵심 악화 원인 2) 놓친 시점·아쉬운 처치 3) 권장 처치 순서를 한국어 350자 내외로 작성하세요.
환자: ${body.species} / ${body.scenario}, 상태: ${body.arrestReason}, 지표: ${JSON.stringify(body.finalVitals || {})}, 로그: ${(body.recentLogs || []).join(' | ')}`;
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: expectJson ? 0.6 : 0.35, maxOutputTokens: 600 }
      })
    });

    if (resp.status === 429) return { statusCode: 429, headers, body: JSON.stringify({ error: '무료 API 한도에 도달했습니다. 잠시 후 다시 시도하세요.' }) };
    if (!resp.ok) return { statusCode: 502, headers, body: JSON.stringify({ error: `Gemini API 오류 (${resp.status})` }) };

    const data = await resp.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    if (expectJson) {
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/,'').trim();
      const caseData = JSON.parse(cleaned);
      return { statusCode: 200, headers, body: JSON.stringify({ caseData }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ text: rawText, analysis: rawText }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'AI 분석 처리 중 오류가 발생했습니다.' }) };
  }
}
