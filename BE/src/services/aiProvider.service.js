/**
 * Lớp gọi LLM dùng chung (trích xuất JSON + chat nhiều lượt).
 *
 * Chuỗi fallback theo thứ tự: GROQ → GEMINI → MIMO.
 * Provider nào không cấu hình key thì bỏ qua; provider nào lỗi thì thử tiếp
 * provider sau. Nếu tất cả đều lỗi/thiếu key → ném lỗi cuối cùng.
 *
 * ENV:
 *   GROQ_API_KEY   — key riêng cho AI (console.groq.com)
 *   GROQ_MODEL     — mặc định 'llama-3.3-70b-versatile'
 *   GEMINI_API_KEY / GEMINI_MODEL — mặc định 'gemini-2.5-flash-lite'
 *   MIMO_API_KEY   — Xiaomi MiMo (api.xiaomimimo.com)
 *   MIMO_MODEL     — mặc định 'mimo-v2.5-pro'
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
// Model đa phương thức (vision) của Groq — dùng làm dự phòng khi Gemini hết quota.
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MIMO_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
const MIMO_MODEL = process.env.MIMO_MODEL || 'mimo-v2.5-pro';

const isGroqConfigured = () => Boolean(process.env.GROQ_API_KEY);
const isGeminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);
const isMimoConfigured = () => Boolean(process.env.MIMO_API_KEY);

/** Nhắc model trả JSON thuần (cho provider không ép schema). */
const JSON_SUFFIX = '\n\nLuôn trả về DUY NHẤT một object JSON hợp lệ, không kèm giải thích, không bọc trong markdown.';

/** Bóc khối JSON đầu tiên từ chuỗi (phòng khi model bọc trong ```json ... ```). */
const parseJsonLoose = (raw) => {
  const text = String(raw || '').trim();
  if (!text) throw new Error('AI trả về nội dung rỗng.');
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error('Không đọc được kết quả JSON từ AI.');
  }
};

/** Chuẩn hóa lịch sử hội thoại → [{role:'user'|'assistant', content}]. */
const normalizeMessages = (messages) =>
  (messages || [])
    .map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
      content: String(m.content ?? m.text ?? '').trim(),
    }))
    .filter((m) => m.content);

/** Gọi endpoint kiểu OpenAI (Groq, Mimo). authHeader tùy provider. */
const callOpenAiCompatible = async (url, authHeaders, model, systemPrompt, messages, { temperature, jsonMode }) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      model,
      temperature,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: `${systemPrompt}${jsonMode ? JSON_SUFFIX : ''}` },
        ...normalizeMessages(messages),
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`API lỗi (${response.status}): ${await response.text()}`);
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content;
};

const callGeminiRaw = async (systemPrompt, messages, { temperature, responseSchema, jsonMode }) => {
  const contents = normalizeMessages(messages).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: contents.length ? contents : [{ role: 'user', parts: [{ text: '' }] }],
    generationConfig: {
      ...(temperature != null ? { temperature } : {}),
      ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      ...(responseSchema ? { responseSchema } : {}),
    },
  };
  const response = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Gemini API lỗi (${response.status}): ${await response.text()}`);
  }
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
};

const DATA_URI_RE = /^data:([^;]+);base64,(.+)$/i;

/** Gemini vision — trả raw text. */
const callGeminiVision = async ({ systemPrompt, userPrompt, mimeType, base64, temperature, responseSchema }) => {
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [
      {
        role: 'user',
        parts: [
          { text: userPrompt },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      ...(temperature != null ? { temperature } : {}),
      responseMimeType: 'application/json',
      ...(responseSchema ? { responseSchema } : {}),
    },
  };
  const response = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Gemini Vision lỗi (${response.status}): ${await response.text()}`);
  }
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
};

/** Vision qua endpoint kiểu OpenAI (Groq, Mimo) — ảnh gửi dưới dạng data URI trong image_url. */
const callOpenAiVision = async ({ url, authHeaders, model, systemPrompt, userPrompt, dataUri, temperature }) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: 'system', content: `${systemPrompt}${JSON_SUFFIX}` },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: dataUri } },
          ],
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`Vision API lỗi (${response.status}): ${await response.text()}`);
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content;
};

// Chuỗi fallback riêng cho phân tích ảnh: Gemini → Groq (vision).
// (Mimo không hỗ trợ ảnh nên không đưa vào chuỗi này.)
const VISION_PROVIDERS = [
  {
    name: 'Gemini',
    isConfigured: isGeminiConfigured,
    call: (args) => callGeminiVision(args),
  },
  {
    name: 'Groq',
    isConfigured: isGroqConfigured,
    call: ({ systemPrompt, userPrompt, dataUri, temperature }) =>
      callOpenAiVision({
        url: GROQ_URL,
        authHeaders: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        model: GROQ_VISION_MODEL,
        systemPrompt,
        userPrompt,
        dataUri,
        temperature,
      }),
  },
];

/**
 * Phân tích một ảnh + prompt, trả JSON. Chạy chuỗi fallback vision (Gemini → Groq → Mimo)
 * để né giới hạn quota của một provider.
 * @returns {Promise<object>} object JSON đã parse.
 */
const analyzeImageJson = async ({ systemPrompt, userPrompt, imageDataUri, temperature = 0.1, responseSchema } = {}) => {
  const match = DATA_URI_RE.exec(String(imageDataUri || ''));
  if (!match) throw new Error('Ảnh không hợp lệ để phân tích.');
  const mimeType = match[1];
  const base64 = match[2];
  const dataUri = String(imageDataUri);

  const active = VISION_PROVIDERS.filter((p) => p.isConfigured());
  if (active.length === 0) {
    throw new Error('Chưa cấu hình provider AI nào hỗ trợ phân tích ảnh (GEMINI_API_KEY / GROQ_API_KEY / MIMO_API_KEY).');
  }

  let lastError;
  for (let i = 0; i < active.length; i += 1) {
    const provider = active[i];
    try {
      const raw = await provider.call({
        systemPrompt,
        userPrompt,
        mimeType,
        base64,
        dataUri,
        temperature,
        responseSchema,
      });
      if (raw && String(raw).trim()) return parseJsonLoose(raw);
      throw new Error(`${provider.name} trả về nội dung rỗng.`);
    } catch (err) {
      lastError = err;
      const next = active[i + 1];
      console.warn(`[aiProvider] Vision ${provider.name} lỗi${next ? `, fallback ${next.name}` : ''}:`, err.message);
    }
  }
  throw lastError || new Error('Tất cả provider AI phân tích ảnh đều lỗi.');
};

const PROVIDERS = [
  {
    name: 'Groq',
    isConfigured: isGroqConfigured,
    call: (systemPrompt, messages, opts) =>
      callOpenAiCompatible(
        GROQ_URL,
        { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        GROQ_MODEL,
        systemPrompt,
        messages,
        opts
      ),
  },
  {
    name: 'Gemini',
    isConfigured: isGeminiConfigured,
    call: (systemPrompt, messages, opts) => callGeminiRaw(systemPrompt, messages, opts),
  },
  {
    name: 'Mimo',
    isConfigured: isMimoConfigured,
    call: (systemPrompt, messages, opts) =>
      callOpenAiCompatible(
        MIMO_URL,
        { 'api-key': process.env.MIMO_API_KEY },
        MIMO_MODEL,
        systemPrompt,
        messages,
        opts
      ),
  },
];

/** Chạy chuỗi fallback, trả về raw text từ provider đầu tiên thành công. */
const runChain = async (systemPrompt, messages, opts) => {
  const active = PROVIDERS.filter((p) => p.isConfigured());
  if (active.length === 0) {
    throw new Error('Chưa cấu hình key AI nào (GROQ_API_KEY / GEMINI_API_KEY / MIMO_API_KEY) trên server.');
  }
  let lastError;
  for (let i = 0; i < active.length; i += 1) {
    const provider = active[i];
    try {
      const out = await provider.call(systemPrompt, messages, opts);
      if (out && String(out).trim()) return out;
      throw new Error(`${provider.name} trả về nội dung rỗng.`);
    } catch (err) {
      lastError = err;
      const next = active[i + 1];
      console.warn(`[aiProvider] ${provider.name} lỗi${next ? `, fallback ${next.name}` : ''}:`, err.message);
    }
  }
  throw lastError || new Error('Tất cả provider AI đều lỗi.');
};

/**
 * Trích xuất JSON từ một prompt đơn (Groq → Gemini → Mimo).
 * @returns {Promise<object>} object đã parse.
 */
const extractJson = async ({ systemPrompt, userPrompt, temperature = 0.1, responseSchema } = {}) => {
  const raw = await runChain(systemPrompt, [{ role: 'user', content: userPrompt }], {
    temperature,
    responseSchema,
    jsonMode: true,
  });
  return parseJsonLoose(raw);
};

/**
 * Chat nhiều lượt trả JSON (Groq → Gemini → Mimo).
 * @param {object} args
 * @param {string} args.systemPrompt
 * @param {Array<{role:string, content?:string, text?:string}>} args.messages lịch sử hội thoại
 * @param {object} [args.responseSchema] schema cho Gemini
 * @param {number} [args.temperature]
 * @returns {Promise<object>} object đã parse.
 */
const chatJson = async ({ systemPrompt, messages, temperature = 0.4, responseSchema } = {}) => {
  const raw = await runChain(systemPrompt, messages, { temperature, responseSchema, jsonMode: true });
  return parseJsonLoose(raw);
};

module.exports = { extractJson, chatJson, analyzeImageJson, isGroqConfigured, isGeminiConfigured, isMimoConfigured };
