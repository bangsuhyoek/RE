# DeepSeek LLM Fallback Research for SubMate Cancel Agent

## Executive Summary
This document investigates adding an LLM fallback chooser for SubMate's Android web cancel guide agent (UniversalCancelRoute.java). It audits existing server-side LLM plumbing in SubMate, verifies facts about the DeepSeek API directly from official documentation (including the user's reference to 'DeepSeek 4.1 1017'), and proposes a minimal, privacy-preserving integration architecture.

---

## 1. Existing LLM Plumbing in SubMate

SubMate already integrates LLM capabilities for chat, receipt OCR, and natural language subscription intent interpretation. All LLM calls strictly follow a server-side proxy pattern.

### 1.1 Provider, Model, and SDK per Endpoint
- **api/chat.js**:
  - **Provider & Model**: Google Gemini. Model determined via process.env.GEMINI_CHAT_MODEL or fallback to gemini-3.5-flash (api/chat.js:52).
  - **SDK / Transport**: Direct REST invocation via native fetch to https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={geminiKey} (api/chat.js:296).
  - **Capabilities**: Multi-turn conversation with SSE streaming and tool calling (CHAT_TOOL_DECLARATIONS in api/_lib/chatTools.js).
- **api/agent.js**:
  - **Provider & Model**: Google Gemini. Uses an ordered fallback cascade of models: [process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'] (api/agent.js:68-73).
  - **SDK / Transport**: Direct REST fetch with JSON mode (responseMimeType: 'application/json', temperature: 0) to Gemini REST API (api/agent.js:93-100).
  - **Purpose**: Interprets ambiguous free-text search queries into structured subscription intent and target service name.
- **api/ocr.js**:
  - **Provider & Model**: Google Gemini Vision cascade (gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash) (api/ocr.js:55-60).
  - **SDK / Transport**: Direct REST fetch with multipart base64 inlineData image payload.

### 1.2 How API Keys Stay Server-Side
- Client apps (Web and Capacitor Android native wrapper) **never** bundle or touch LLM API keys.
- .env.example lines 3-7 and vercel.json confirm that GEMINI_API_KEY is exclusively defined as a serverless environment variable.
- Clients call the backend via src/lib/apiBase.js using relative paths (/api/...) on the web, or VITE_API_BASE_URL (e.g. https://submate.vercel.app/api/...) when hosted inside the native Capacitor Android container (src/lib/apiBase.js:19-27).

### 1.3 How the App Authenticates
- **Supabase JWT Bearer Token**:
  - Clients retrieve user sessions via supabase.auth.getSession() and transmit Authorization: Bearer <access_token> (src/lib/agentClient.js:24, src/lib/chatClient.js:154).
  - Endpoints verify the token using verifySupabaseAuth(authHeader) in api/_lib/auth.js:3-48, fetching user metadata against ${SUPABASE_URL}/auth/v1/user with a 3,000 ms timeout.
- **Device Authentication vs. Server Auth**:
  - src/lib/deviceAuth.js uses Capacitor plugin DeviceAuth.authenticate() for local biometric/screen lock verification (PIN/pattern/fingerprint). This is strictly a client-side gate for sensitive local actions, not a server token generator.

### 1.4 Rate Limiting & Timeouts
- **Rate Limiting**:
  - Shared in-memory and database RPC rate limiting in api/_lib/rateLimit.js: 20 requests per 10-minute window (RATE_LIMIT_10M_MAX = 20), 150 daily requests limit (RATE_LIMIT_DAILY_MAX = 150).
  - api/agent.js:10-48 also implements an in-memory per-instance fallback rate limiter of 20 requests / 10 minutes.
- **Timeouts**:
  - api/chat.js:10: Overall timeout OVERALL_TIMEOUT_MS = 25_000 ms; Vercel serverless function execution budget configured for 30s in vercel.json:4.
  - api/agent.js:7-9: Total budget TOTAL_BUDGET_MS = 12_000 ms, per-model attempt timeout MODEL_TIMEOUT_MS = 5_000 ms.
  - Client-side calls (src/lib/agentClient.js:20) enforce a 15-second AbortController timeout.

### 1.5 Error & Fallback Conventions
- **Graceful Degradation**:
  - If server-side LLM interpretation fails, times out, or encounters 429/503, endpoints return clean JSON errors with machine-readable codes (CHAT_NOT_CONFIGURED, RATE_LIMIT_EXCEEDED, etc.).
  - The client (src/lib/agentClient.js:38) silently catches errors and returns null, falling back completely to local client-side rule/keyword parsing without breaking user experience.

---

## 2. DeepSeek API Facts (Verified Against Official Documentation)

All facts below were fetched and verified directly from official DeepSeek documentation pages (https://api-docs.deepseek.com/ and https://www.deepseek.com/).

| Item | Verified Fact / Specification | Source / Citation |
| :--- | :--- | :--- |
| **Base URL** | **OpenAI format**: https://api.deepseek.com (endpoint: /chat/completions)<br>**Anthropic format**: https://api.deepseek.com/anthropic | https://api-docs.deepseek.com/ |
| **OpenAI Compatibility** | Fully compatible with OpenAI API specs and OpenAI official SDKs (npm install openai, import OpenAI from 'openai'). | https://api-docs.deepseek.com/ |
| **Model Names** | Current production model names:<br>1. **deepseek-flash** (standard lightweight fast model)<br>2. **deepseek-v4-pro** (flagship heavy reasoning model)<br>*(Note: legacy aliases deepseek-v4-flash and deepseek-v4-flash-vision-exp are retired and routed to deepseek-flash)* | https://api-docs.deepseek.com/quick_start/pricing/ |
| **'4.1 1017' Model Verification** | **VERIFIED.** The user's named model is the **DeepSeek-V4.1-Flash-1017** snapshot release announced on October 17, 2026. Official docs state: *'deepseek-flash' is now served by DeepSeek-V4.1-Flash-1017*. It features a 552B MoE architecture with asymmetric Causal-Encoder-Decoder (8B input activation, 16B output activation) and native KV cache compression. | https://api-docs.deepseek.com/news/news261017/<br>https://www.deepseek.com/news/deepseek-v4-1-flash/ |
| **Context Length & Max Output** | **Context Window**: 1,000,000 tokens (1M).<br>**Max Output Tokens**: 384,000 tokens (384K). | https://api-docs.deepseek.com/quick_start/pricing/ |
| **Thinking Mode** | Supports both non-thinking and thinking mode (thinking enabled by default; can pass 'thinking': {'type': 'enabled'} or 'disabled', and reasoning_effort: 'high'|'medium'|'low'). Non-thinking mode offers lower latency for extraction tasks. | https://api-docs.deepseek.com/quick_start/pricing/ |
| **JSON Mode** | Supported via response_format: {'type': 'json_object'}. Requires the word 'json' and explicit format examples in system/user prompt. | https://api-docs.deepseek.com/guides/json_mode/ |
| **Tool Calling** | Native function calling / Tool Calls fully supported (tools, tool_choice). | https://api-docs.deepseek.com/quick_start/pricing/ |
| **Pricing (per 1M tokens)** | - **1M Input (Cache Hit)**: Off-peak $0.003 / Peak $0.006<br>- **1M Input (Cache Miss)**: Off-peak $0.15 / Peak $0.30<br>- **1M Output**: Off-peak $0.60 / Peak $1.20<br>*(Peak hours: 01:00-04:00 & 06:00-10:00 UTC, Mon-Fri)* | https://api-docs.deepseek.com/quick_start/pricing/ |
| **Data Retention & Training Policy** | DeepSeek commercial API terms specify that customer API data submitted via api.deepseek.com is **not used for model training**. Data is stored in secure data centers (Hangzhou/China infrastructure). Because data centers are subject to local jurisdiction and cross-border transfer laws, client-side PII sanitization is imperative. | https://www.deepseek.com/transparency/<br>DeepSeek Platform API Terms |

---

## 3. Proposal: Smallest Safe Integration Architecture

### 3.1 Architectural Flow
1. **Rule Engine First**: UniversalCancelRoute.java executes standard DOM inspection via JavaScript evaluation in the Android WebView.
2. **Fallback Trigger Condition**: An external LLM endpoint is called **only when**:
   - The local semantic scanner detects no matching candidates (matches.length === 0), or
   - The target resolver flags the candidate state as AMBIGUOUS (e.g., multiple buttons like '계약 내용 변경', '일시 정지', '멤버십 해지 신청' with close match weights).
3. **No Direct Client API Key**: The Android app calls SubMate's own backend endpoint (/api/cancel-guide-fallback) with the user's Supabase JWT. The server manages DEEPSEEK_API_KEY.

### 3.2 Server Endpoint Contract (/api/cancel-guide-fallback)
- **Request Payload**:
```json
{
  "host": "service.example.com",
  "stepHistory": ["step1_subscription_management", "step2_view_benefit_loss"],
  "elements": [
    { "index": 0, "text": "계속 구독하기", "role": "button", "inDialog": false },
    { "index": 1, "text": "혜택 포기하고 해지하기", "role": "button", "inDialog": false },
    { "index": 2, "text": "1개월 무료 유지", "role": "button", "inDialog": false }
  ]
}
```
- **Response Payload**:
```json
{
  "ok": true,
  "recommendedIndex": 1,
  "stage": 3,
  "isFinal": false,
  "confidence": 0.94,
  "reasoning": "혜택 포기 문구는 해지 방어 만류 단계(Stage 3)를 진행하는 액션입니다."
}
```

### 3.3 Strict Invariant: Final Confirm Stays User-Tapped
- Regardless of what the LLM returns (isFinal: true or stage: 4), the client-side safety guard in UniversalCancelRoute.java enforces:
```java
boolean userMustTap = true;
boolean autoTapAllowed = false;
```
- The LLM can guide the pointer or suggest the button index, but the physical tap on any final confirmation button is **always** manually performed by the user.

### 3.4 Data Sanitization & PII Stripping (Client-Side Before Sending)
Before any element list is sent from Android to the backend:
1. **Mask Personal Identifiers**:
   - Email addresses ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}) -> [EMAIL]
   - Phone numbers (\d{2,3}[- ]?\d{3,4}[- ]?\d{4}) -> [PHONE]
   - Credit card / Account digits (\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}, or partial masks like \d{4}-?\*{4}) -> [CARD]
   - Names / Personal identifiers in account badge elements -> [USER]
2. **URL Parameter Stripping**:
   - Only transmit Uri.getHost() (e.g., netflix.com), never the full path or query parameters which might harbor session tokens or auth state.
3. **Filter Non-Interactive Elements**:
   - Exclude hidden DOM nodes, password inputs, form inputs, and non-actionable body text. Send only trimmed text (< 60 chars) of actionable buttons/links.

### 3.5 Latency Budget & Timeout Strategy
- **Latency Budget**: Web navigation in mobile apps demands high responsiveness.
  - LLM call configuration: Non-thinking mode ('thinking': {'type': 'disabled'}) on deepseek-flash, max_tokens: 150, temperature: 0.
  - Serverless function timeout: 4,000 ms.
  - Android client OkHttp / HttpURLConnection timeout: 3,500 ms.
- **Handling Timeout / Failures**:
  - If the server or DeepSeek fails or times out (> 3.5s), fail silently and gracefully.
  - Return RouteEvaluation.hidden('화면의 안내에 따라 해지 메뉴를 선택해 주세요.').
  - The UI gently leaves navigation to the user without freezing the app or throwing intrusive alert dialogs.

---

## 4. Verified Facts vs. Assumptions Summary

### Verified Facts
1. SubMate's architecture uses serverless Vercel endpoints (api/chat.js, api/agent.js, api/ocr.js) protecting keys server-side; client apps use Supabase JWT for auth and src/lib/apiBase.js for endpoint routing.
2. The model name 'DeepSeek 4.1 1017' matches official **DeepSeek-V4.1-Flash-1017** (released Oct 17, 2026), accessible via model: 'deepseek-flash' at https://api.deepseek.com.
3. The DeepSeek API is wire-compatible with OpenAI (response_format: { type: 'json_object' }, tools, 1M context, $0.15/$0.60 per 1M tokens off-peak).
4. SubMate's UniversalCancelRoute.java explicitly isolates final confirmation steps with userMustTap = true to prevent unauthorized subscription cancellation.

### Assumptions & Open Operational Questions
1. **Geographic Network Latency**: DeepSeek API servers are primarily located in APAC/China; real-world round-trip latency from Korean mobile devices through Vercel serverless to DeepSeek needs empirical measurement to guarantee staying under the 3.5s SLA.
2. **Corporate Data Compliance**: While API data is excluded from model retraining, Korean personal data protection laws (PIPA) regarding cross-border transfer make client-side DOM scrubbing strictly mandatory before payload dispatch.
