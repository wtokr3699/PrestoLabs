// AI 단가 분석 코어 — DB/프로젝트 생성과 분리된 순수 분석 로직.
// 게시글 생성 없이 설명+카테고리만으로 견적을 산출한다.

export type EstimateFeature = { name: string; estimatedPrice: number; description?: string };
export type Estimate = { features: EstimateFeature[]; totalEstimate: number; report: string };

// LLM_API_KEY 없을 때 카테고리 기반 현실적 폴백 분석 생성
export function buildFallbackAnalysis(category: string, description: string): Estimate {
  const templates: Record<string, { features: EstimateFeature[]; report: string }> = {
    website: {
      features: [
        { name: "UI/UX 디자인 (Figma)", estimatedPrice: 800000 },
        { name: "프론트엔드 개발 (React/Next.js)", estimatedPrice: 1500000 },
        { name: "백엔드 API 개발", estimatedPrice: 1200000 },
        { name: "DB 설계 및 연동", estimatedPrice: 500000 },
        { name: "배포 및 인프라 구성", estimatedPrice: 300000 },
      ],
      report: "웹사이트 개발 프로젝트로, UI 디자인부터 백엔드 API까지 전반적인 개발이 필요합니다. 기능 복잡도와 디자인 요구사항에 따라 비용이 변동될 수 있으며, 유지보수 비용도 별도로 협의하시기 바랍니다.",
    },
    landing: {
      features: [
        { name: "랜딩페이지 디자인 (Figma)", estimatedPrice: 600000 },
        { name: "반응형 웹 구현", estimatedPrice: 800000 },
        { name: "애니메이션 및 인터랙션", estimatedPrice: 300000 },
        { name: "SEO 최적화", estimatedPrice: 200000 },
      ],
      report: "랜딩페이지 특성상 첫인상과 전환율(CTA)이 핵심입니다. 디자인 퀄리티에 따라 비용 차이가 크며, A/B 테스트 설정을 포함하면 추가 비용이 발생합니다.",
    },
    mvp: {
      features: [
        { name: "기획 및 요구사항 정의", estimatedPrice: 500000 },
        { name: "핵심 기능 개발", estimatedPrice: 3000000 },
        { name: "사용자 인증 (로그인/회원가입)", estimatedPrice: 600000 },
        { name: "관리자 대시보드", estimatedPrice: 800000 },
        { name: "QA 및 버그 수정", estimatedPrice: 400000 },
      ],
      report: "MVP는 핵심 기능에 집중해 빠르게 시장 반응을 검증하는 데 목적이 있습니다. 스코프를 명확히 정의할수록 비용과 일정 예측이 정확해지므로, 기능 우선순위 정리를 먼저 권장드립니다.",
    },
    app: {
      features: [
        { name: "앱 UI/UX 디자인", estimatedPrice: 1200000 },
        { name: "iOS/Android 개발", estimatedPrice: 3500000 },
        { name: "백엔드 API 개발", estimatedPrice: 1500000 },
        { name: "푸시 알림 연동", estimatedPrice: 300000 },
        { name: "앱스토어 배포 지원", estimatedPrice: 200000 },
      ],
      report: "모바일 앱 프로젝트는 플랫폼(iOS/Android) 선택에 따라 비용이 크게 달라집니다. React Native 등 크로스플랫폼 프레임워크를 활용하면 단일 코드베이스로 양 플랫폼을 동시에 출시할 수 있어 비용 절감이 가능합니다.",
    },
    admin: {
      features: [
        { name: "대시보드 UI 설계", estimatedPrice: 600000 },
        { name: "데이터 시각화 (차트/테이블)", estimatedPrice: 800000 },
        { name: "권한 관리 시스템", estimatedPrice: 500000 },
        { name: "API 연동 및 CRUD", estimatedPrice: 700000 },
      ],
      report: "관리자 시스템은 내부 운영 효율을 높이는 핵심 도구입니다. 데이터 규모와 사용자 권한 체계에 따라 복잡도가 달라지므로, 현재 운영 프로세스를 먼저 정리한 뒤 개발 범위를 확정하시길 권장합니다.",
    },
    automation: {
      features: [
        { name: "업무 흐름 분석 및 설계", estimatedPrice: 400000 },
        { name: "자동화 파이프라인 구축 (n8n/Zapier/Python)", estimatedPrice: 1200000 },
        { name: "외부 API/서비스 연동", estimatedPrice: 600000 },
        { name: "모니터링 및 알림 설정", estimatedPrice: 300000 },
      ],
      report: "업무 자동화는 반복 작업을 제거해 인건비를 절감하는 데 효과적입니다. 연동 시스템 수와 예외 처리 복잡도에 따라 비용이 결정되며, 초기 구축 후 유지보수 비용이 거의 발생하지 않는 장점이 있습니다.",
    },
    chatbot: {
      features: [
        { name: "챗봇 시나리오 설계", estimatedPrice: 400000 },
        { name: "AI/LLM 연동 개발", estimatedPrice: 1000000 },
        { name: "채널 연동 (카카오/슬랙/웹)", estimatedPrice: 500000 },
        { name: "FAQ 데이터 구축", estimatedPrice: 300000 },
        { name: "운영 대시보드", estimatedPrice: 400000 },
      ],
      report: "챗봇은 고객 응대 비용을 낮추고 24시간 서비스를 가능하게 합니다. LLM 기반 챗봇은 시나리오 챗봇보다 자연스러운 대화가 가능하지만 운영 비용(API 호출료)이 발생하므로 트래픽 규모를 고려한 설계가 필요합니다.",
    },
    marketing: {
      features: [
        { name: "마케팅 전략 수립", estimatedPrice: 600000 },
        { name: "콘텐츠 제작 (월 4건)", estimatedPrice: 800000 },
        { name: "SNS 광고 운영", estimatedPrice: 500000 },
        { name: "성과 분석 리포트", estimatedPrice: 300000 },
      ],
      report: "디지털 마케팅은 광고비와 운영비를 구분해서 예산을 책정하는 것이 중요합니다. 초기 3개월은 테스트 기간으로 보고 데이터를 축적한 뒤 최적 채널에 집중 투자하는 전략을 권장합니다.",
    },
    design: {
      features: [
        { name: "브랜드 아이덴티티 설계", estimatedPrice: 800000 },
        { name: "로고 디자인 (3안 제시)", estimatedPrice: 500000 },
        { name: "컬러 팔레트 & 타이포그래피", estimatedPrice: 300000 },
        { name: "브랜드 가이드라인 문서", estimatedPrice: 400000 },
      ],
      report: "브랜드 디자인은 기업 이미지를 장기적으로 결정하는 투자입니다. 레퍼런스(참고 이미지)를 충분히 준비할수록 시안 수정 횟수가 줄어들어 비용과 시간이 절약됩니다.",
    },
    other: {
      features: [
        { name: "요구사항 분석 및 기획", estimatedPrice: 400000 },
        { name: "핵심 기능 개발", estimatedPrice: 2000000 },
        { name: "테스트 및 품질 검증", estimatedPrice: 500000 },
        { name: "배포 및 인수인계", estimatedPrice: 300000 },
      ],
      report: "프로젝트 규모와 복잡도에 따라 비용이 결정됩니다. 요구사항을 구체적으로 문서화할수록 견적 정확도가 높아지므로, 기능 목록과 우선순위를 먼저 정리하신 후 전문가와 상담하시길 권장합니다.",
    },
  };

  // 설명에서 키워드를 기반으로 가격 보정 (복잡도 반영)
  const hasComplexKeyword = /실시간|WebSocket|결제|Payment|AI|머신러닝|빅데이터|마이크로서비스|OAuth|3D/i.test(description);
  const multiplier = hasComplexKeyword ? 1.3 : 1.0;

  const template = templates[category] ?? templates.other;
  const features = template.features.map((f) => ({
    ...f,
    estimatedPrice: Math.round((f.estimatedPrice * multiplier) / 10000) * 10000,
  }));
  const totalEstimate = features.reduce((sum, f) => sum + f.estimatedPrice, 0);

  return { features, totalEstimate, report: template.report };
}

// 설명+카테고리로 견적 산출. LLM_API_KEY 있으면 LLM, 없거나 실패하면 폴백.
export async function estimateProject(description: string, category: string): Promise<Estimate> {
  const prompt = `
당신은 IT 프리랜서 플랫폼의 단가 분석 전문가입니다.
아래 프로젝트 설명을 분석하여 단위 기능별 예상 단가를 산정해주세요.

프로젝트 카테고리: ${category}
프로젝트 설명: ${description}

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "features": [
    {"name": "기능명", "description": "기능 설명", "estimatedPrice": 숫자(원 단위)}
  ],
  "totalEstimate": 전체 예상 금액(숫자),
  "report": "전체 분석 요약 (2-3문장)"
}
  `.trim();

  try {
    if (!process.env.LLM_API_KEY) {
      return buildFallbackAnalysis(category, description);
    }

    let aiResponse: string | null = null;

    if (process.env.LLM_PROVIDER === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.LLM_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Anthropic API 오류 (${res.status}): ${errBody}`);
      }
      const data = await res.json();
      aiResponse = data.content?.[0]?.text ?? null;
    } else if (process.env.LLM_PROVIDER === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`OpenAI API 오류 (${res.status}): ${errBody}`);
      }
      const data = await res.json();
      aiResponse = data.choices?.[0]?.message?.content ?? null;
    }

    if (!aiResponse) throw new Error("AI 응답 없음");

    const parsed = JSON.parse(aiResponse);
    return {
      features: parsed.features ?? [],
      totalEstimate: parsed.totalEstimate ?? 0,
      report: parsed.report ?? "",
    };
  } catch (err) {
    console.error("AI 분석 실패, 폴백 사용:", err);
    return buildFallbackAnalysis(category, description);
  }
}
