// /api/judge.js
// Vercel 서버리스 함수 — Gemini API 키는 환경 변수(GEMINI_API_KEY)에서만 읽고
// 절대 클라이언트로 전달하지 않습니다.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: '서버에 GEMINI_API_KEY 환경 변수가 설정되어 있지 않습니다. Vercel 프로젝트 설정 > Environment Variables에서 추가해주세요.'
    });
  }

  const { images, customCriteria, keywords, judgeId } = req.body || {};

  if (!Array.isArray(images) || images.length < 2) {
    return res.status(400).json({ error: '비교 심사를 위해 최소 2장 이상의 이미지가 필요합니다.' });
  }
  if (images.length > 12) {
    return res.status(400).json({ error: '한 번에 최대 12장까지 심사할 수 있습니다.' });
  }

  // ── 심사위원 페르소나 ──
  const JUDGE_PERSONAS = {
    default:       '균형 잡힌 기본 심사위원으로서, 구도·조명·인물·선명도를 종합적으로 평가합니다.',
    fashion:       '패션 화보를 다루는 전문 포토그래퍼로서, 스타일링·포즈·실루엣·트렌디함을 중시해 평가합니다.',
    documentary:   '다큐멘터리 사진가로서, 진솔함·순간 포착력·현장의 분위기와 스토리텔링을 중시해 평가합니다.',
    architecture:  '건축 비평가로서, 구조의 균형감·공간감·라인과 비례, 빛과 그림자의 활용을 중시해 평가합니다.',
    art:           '예술 감독으로서, 색채 구성·미학적 완성도·독창적인 시각적 임팩트를 중시해 평가합니다.',
    commercial:    '광고/커머셜 디렉터로서, 시선을 끄는 힘·메시지 전달력·상업적 완성도를 중시해 평가합니다.',
    wedding:       '웨딩 전문 사진가로서, 감정의 진실성·자연스러운 순간·따뜻한 색감과 분위기를 중시해 평가합니다.',
    portrait:      '인물 사진 전문가로서, 표정의 디테일·눈빛·피부 톤과 조명의 조화를 중시해 평가합니다.',
    landscape:     '풍경 사진 거장으로서, 자연광의 활용·스케일감·전경/중경/배경의 레이어 구성을 중시해 평가합니다.',
    street:        '스트리트 포토그래퍼로서, 우연성·타이밍·도시의 결정적 순간을 포착하는 능력을 중시해 평가합니다.',
    food:          '푸드 포토그래퍼로서, 음식의 질감 표현·색감의 식욕 자극도·플레이팅 구도를 중시해 평가합니다.',
    fineart:       '순수 미술 작가로서, 개념적 깊이·형식적 실험성·기술보다 의미를 우선해 평가합니다.',
    sports:        '스포츠 사진 전문가로서, 동작의 절정 포착·역동성·선명한 디테일을 중시해 평가합니다.',
    travel:        '여행 사진 작가로서, 현지의 분위기 전달력·이야기성·여행자의 시선을 중시해 평가합니다.',
    minimal:       '미니멀리즘 사진가로서, 여백의 활용·단순함 속의 균형·절제된 색감을 중시해 평가합니다.',
    vintage:       '필름/빈티지 감성 전문가로서, 톤의 따뜻함·질감·시간이 느껴지는 분위기를 중시해 평가합니다.',
    instagram:     'SNS 트렌드 전문 큐레이터로서, 한눈에 시선을 끄는 힘·트렌디함·공유하고 싶은 매력을 중시해 평가합니다.',
    blackwhite:    '흑백 사진 마스터로서, 명암 대비·톤의 깊이·형태와 질감의 표현력을 중시해 평가합니다.',
    cinematic:     '영화 촬영감독(시네마토그래퍼)으로서, 빛과 그림자의 드라마틱한 활용·영화적 분위기·색보정 톤을 중시해 평가합니다.',
    harsh:         '냉철한 비평가로서, 기술적 결함과 완성도의 빈틈을 가감 없이 짚어내며 매우 엄격한 기준으로 평가합니다.',
  };
  const personaText = JUDGE_PERSONAS[judgeId] || JUDGE_PERSONAS.default;

  const keywordText = Array.isArray(keywords) && keywords.length
    ? `다음 키워드를 평가에 특히 반영하세요: ${keywords.join(', ')}.`
    : '';
  const customText = customCriteria && customCriteria.trim()
    ? `사용자가 지정한 추가 심사 기준: "${customCriteria.trim()}" — 이 기준을 우선적으로 반영하세요.`
    : '';

  const systemPrompt = `당신은 전문 사진 심사위원입니다. ${personaText}
사용자가 올린 여러 장의 이미지를 비교 심사합니다. 이미지에는 인물 사진뿐 아니라 건축 다이어그램, 렌더링, 도면, 텍스트 패널 등이 포함될 수 있습니다.

기본 평가 기준 ("이미지 자체의 시각적 품질"):
- 인물이 있는 경우: 표정, 포즈, 자연스러움
- 구도 (프레이밍, 균형, 시선 유도, 여백)
- 조명/색감 (노출, 명암 대비, 색조의 완성도)
- 선명도/디테일, 전체적인 완성도와 전달력

인물이 없는 이미지(다이어그램, 렌더링, 도면 등)는 인물 점수를 평균값(70)으로 두고 나머지 기준으로 평가하세요.

${keywordText}
${customText}

각 이미지에 어울리는 짧고 인상적인 한글 이름(닉네임, 4~12자)도 지어주세요.

반드시 다음 JSON 형식으로만, 간결하게 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "rankings": [
    {
      "photoIndex": 1,
      "rank": 1,
      "nickname": "이미지에 어울리는 한글 이름",
      "totalScore": 92,
      "reason": "이 순위인 이유를 1~2문장으로 간결하게 설명",
      "tags": ["좋은 구도","선명한 디테일"],
      "subScores": {"composition": 90, "lighting": 88, "portrait": 70, "sharpness": 92}
    }
  ]
}
photoIndex는 1부터 시작하는 사진 번호이며, 업로드된 모든 이미지에 대해 순위를 매겨주세요(전체 순위, rank 1이 최고). reason은 반드시 짧게 작성하세요.`;

  const imageParts = images.map((img, i) => ([
    { text: `[사진 ${i + 1}] 파일명: ${img.name || '이름 없음'}` },
    { inline_data: { mime_type: img.mediaType, data: img.base64 } }
  ])).flat();

  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // 55초 타임아웃 (Vercel 서버리스 함수 기본 한도보다 짧게)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          role: 'user',
          parts: [
            { text: `아래 ${images.length}장의 사진을 심사하고 순위를 매겨주세요.` },
            ...imageParts
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      let friendly = `Gemini API 오류 (${response.status})`;
      if (response.status === 400) friendly += ' — 요청 형식 오류 또는 이미지 용량이 너무 큽니다.';
      if (response.status === 403) friendly += ' — API 키 권한 문제입니다.';
      if (response.status === 429) friendly += ' — 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      return res.status(502).json({ error: friendly, detail: errText.slice(0, 300) });
    }

    const data = await response.json();
    const candidate = data.candidates && data.candidates[0];

    if (!candidate) {
      const blockReason = data.promptFeedback ? data.promptFeedback.blockReason : null;
      return res.status(502).json({
        error: blockReason
          ? `AI가 이 요청을 처리하지 못했습니다 (차단 사유: ${blockReason}).`
          : '응답이 비어 있습니다. 다시 시도해주세요.'
      });
    }

    if (candidate.finishReason === 'MAX_TOKENS') {
      return res.status(502).json({ error: '응답이 너무 길어 잘렸습니다. 사진 수를 줄여서 다시 시도해주세요.' });
    }
    if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
      return res.status(502).json({ error: `AI 안전 정책에 의해 응답이 차단되었습니다 (${candidate.finishReason}).` });
    }

    const textBlock = candidate.content && candidate.content.parts
      ? candidate.content.parts.find(p => p.text)
      : null;
    if (!textBlock) {
      return res.status(502).json({ error: `AI 응답에서 텍스트를 찾을 수 없습니다. (종료 사유: ${candidate.finishReason || 'UNKNOWN'})` });
    }

    let jsonStr = textBlock.text.trim().replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      return res.status(502).json({ error: 'AI 응답을 해석하지 못했습니다. 사진 수를 줄이고 다시 시도해주세요.' });
    }

    if (!parsed.rankings || !parsed.rankings.length) {
      return res.status(502).json({ error: '심사 결과가 비어 있습니다. 다시 시도해주세요.' });
    }

    return res.status(200).json(parsed);

  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: '응답 시간이 너무 오래 걸려 요청을 중단했습니다. 사진 수를 줄이거나 용량을 줄여서 다시 시도해주세요.' });
    }
    return res.status(500).json({ error: '서버 오류: ' + e.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb' // 이미지 여러 장의 base64 payload를 위해 기본 한도(4mb)보다 상향
    }
  }
};
