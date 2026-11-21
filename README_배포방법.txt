[수의 마취 3단계 통합 시뮬레이터 — Netlify 배포 가이드]
© 2026 DVM 이혁민

포함 파일 구성:
- index.html                  : 3단계 통합 메인 포털 (도입 · 유지 · 회복 선택)
- induction.html              : Phase 1 마취 도입–전환 시뮬레이터 (5대 케이스 + AI 문진/약물심사)
- maintenance.html            : Phase 2 마취 유지 모니터링 시뮬레이터 (10대 케이스 + 3분할 특수약물 + AI 랜덤환자/힌트/오답노트/SOAP)
- recovery.html               : Phase 3 마취 종료·회복 시뮬레이터 (5대 케이스 + 발관 판정 + AI 퇴원 안내)
- netlify.toml                : Netlify 함수 경로 설정
- netlify/functions/ai.js     : 6종 AI 기능 통합 서버리스 프록시 (API 키 보호)
- netlify/functions/debrief.js: 사후 디브리핑 전용 호환 프록시

[배포 방법]
1. Google AI Studio (https://aistudio.google.com/)에서 무료 Gemini API 키 발급
2. 이 ZIP의 압축을 풀어 GitHub 저장소에 업로드 후 Netlify(https://app.netlify.com/)에서 'Import from Git' 연결
3. Netlify → Site configuration → Environment variables에 Key: GEMINI_API_KEY / Value: 발급받은 키 저장 후 재배포
* 유지보수 시 수정이 필요한 해당 HTML 파일(예: maintenance.html) 1개만 교체하면 됩니다.
* API 키 없이 올려도 모든 내장 오답노트·오프라인 시뮬레이션 기능은 100% 정상 작동합니다.
