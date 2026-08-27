# ElevateBox AI Caller API

ElevateBox AI Voice Sales Assistant is an AI-powered voice sales system for e-commerce website leads. It uses Vapi for live voice interaction, Node.js and Express for backend orchestration, Render for deployment, and Meta WhatsApp Cloud API for real WhatsApp delivery.

The system talks to customers, discovers business type, product count, budget, timeline, required features, and buying intent, classifies leads as HOT, WARM, or COLD, triggers WhatsApp during the call for HOT leads, schedules callbacks from spoken phrases, and sends a contextual final WhatsApp follow-up.

## Current Status

### Working

- Live Vapi voice conversation
- Sales conversation for e-commerce website development
- Lead discovery and structured data extraction
- Business type extraction
- Product count extraction
- Budget extraction and spoken-number normalization
- Timeline extraction
- Feature extraction
- Buying-intent detection
- HOT / WARM / COLD classification
- Mid-call HOT lead action
- Real Meta WhatsApp Cloud API delivery
- Spoken callback parsing
- Callback scheduling logic
- Contextual final WhatsApp follow-up
- Mobile number included in final follow-up
- Architecture image delivery
- Resume PDF delivery
- Vapi webhook integration
- Partial transcript handling
- Duplicate webhook protection
- Duplicate WhatsApp action protection
- Render deployment

### Known Limitation

The outbound call orchestration endpoint is implemented and provider-ready, but autonomous PSTN calling to the final Indian target number requires an international-capable telephony provider/number connected to Vapi.

## Live Links

Backend: [https://elevatebox-ai-caller.onrender.com](https://elevatebox-ai-caller.onrender.com)

Repository: [https://github.com/RajuAnsary/elevatebox-ai-caller](https://github.com/RajuAnsary/elevatebox-ai-caller)

Architecture: [public/architecture.png](public/architecture.png)

Resume: [public/resume.pdf](public/resume.pdf)

## End-to-End Flow

```text
Customer
→ Vapi Voice Call
→ Vapi Webhook
→ Transcript Processing
→ Lead Data Extraction
→ HOT / WARM / COLD Classification
→ Action Decision

HOT:
→ Real WhatsApp message during call

WARM:
→ Callback scheduling

COLD:
→ Low-priority follow-up

After call:
→ Contextual final WhatsApp
→ Mobile number
→ Architecture image
→ Resume PDF
```

## Final Assignment Note

I built an AI voice sales assistant for e-commerce website leads using Vapi, Node.js/Express, Render, and Meta WhatsApp Cloud API.

The system handles live voice conversations, extracts business type, product count, budget, timeline, features, and buying intent, then classifies the lead as HOT, WARM, or COLD. HOT leads trigger a real WhatsApp message while the call is still active. WARM leads can be scheduled for callbacks from spoken phrases such as “tomorrow morning.” After the call, the system sends a contextual WhatsApp follow-up containing the actual discussion, my mobile number, architecture image, and resume.

I added handling for partial Vapi transcripts, duplicate events, spoken-number normalization, contextual follow-ups, and duplicate action protection.

Working now: live Vapi conversation, lead extraction, classification, callback parsing, real Meta WhatsApp mid-call action, and final contextual follow-up with media.

Current limitation: autonomous outbound PSTN calling to the target Indian number requires an international-capable telephony provider/number. The call orchestration endpoint is already implemented and provider-ready.

## Prerequisites

- Node.js 18 or later
- npm

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file and add your Vapi values:

   ```bash
   copy .env.example .env
   ```

   On macOS/Linux use `cp .env.example .env`.

3. Configure the required environment variables in `.env`:

   | Variable | Purpose |
   | --- | --- |
   | `VAPI_API_KEY` | Private API key used to authorize this server with Vapi. |
   | `VAPI_ASSISTANT_ID` | ID of the saved Vapi assistant that will conduct the call. |
   | `VAPI_PHONE_NUMBER_ID` | ID of the Vapi or imported provider phone number that places the call. |
   | `TARGET_PHONE_NUMBER` | Destination customer number in E.164 format, for example `+919876543210`. |

4. Start the API:

   ```bash
   npm run dev
   ```

   Or run it without automatic restarts:

   ```bash
   npm start
   ```

5. Check that it is running:

   ```bash
   curl http://localhost:3000/health
   ```

## Deploy to Render

1. Push this project to a GitHub, GitLab, or Bitbucket repository. Do not commit `.env` or any API keys.
2. In Render, select **New** → **Web Service** and connect the repository.
3. Use these service settings:

   | Setting | Value |
   | --- | --- |
   | Language | `Node` |
   | Build Command | `npm ci` |
   | Start Command | `npm start` |
   | Health Check Path | `/health` |

4. Add environment variables in Render's **Environment** section:

   | Variable | Required | Purpose |
   | --- | --- | --- |
   | `NODE_ENV=production` | Yes | Marks the deployed runtime as production. |
   | `PORT` | No | Render supplies this automatically; do not hardcode a value. |
   | `VAPI_API_KEY` | Only for Vapi call/configuration routes | Private server-side Vapi API key. |
   | `VAPI_ASSISTANT_ID` | Only for Vapi call/configuration routes | Saved Vapi assistant ID. |
   | `VAPI_PHONE_NUMBER_ID` | Only for outbound Vapi calls | Originating Vapi phone-number ID. |
   | `TARGET_PHONE_NUMBER` | Only for outbound Vapi calls | Outbound test destination in E.164 format. |
   | `TELEPHONY_PROVIDER` | Optional | `vapi` (default) or `exotel`. |
   | `EXOTEL_ACCOUNT_SID` | Required for Exotel | Account SID from Exotel API settings. |
   | `EXOTEL_API_KEY` | Required for Exotel | Exotel API key used as the Basic Auth username. |
   | `EXOTEL_API_TOKEN` | Required for Exotel | Exotel API token used as the Basic Auth password. |
   | `EXOTEL_SUBDOMAIN` | Required for Exotel | Exotel API hostname, for example `api.exotel.com`. |
   | `EXOTEL_CALLER_ID` | Required for Exotel | Registered Exotel caller ID / virtual number. |
   | `EXOTEL_TARGET_NUMBER` | Required for Exotel | Indian destination to call; test with your own verified number first. |
   | `MY_PHONE_NUMBER` | Optional | Follow-up metadata only. |
   | `RESUME_PATH` | Optional | Resume attachment metadata only. |
   | `ARCHITECTURE_IMAGE_PATH` | Optional | Architecture-image attachment metadata only. |
   | `WHATSAPP_PROVIDER` | Optional | Set to `meta` to enable Meta WhatsApp Cloud API; leave unset for mock delivery. |
   | `WHATSAPP_ACCESS_TOKEN` | Required for Meta | Meta system-user access token. |
   | `WHATSAPP_PHONE_NUMBER_ID` | Required for Meta | WhatsApp sender phone-number ID from Meta. |
   | `WHATSAPP_API_VERSION` | Required for Meta | Graph API version, such as `v23.0`. |
   | `WHATSAPP_RECIPIENT_NUMBER` | Required for Meta | Recipient number; a bare Indian mobile number is normalized to the `91` country code. |

   The local conversation, classification, callback, mock WhatsApp, follow-up, and session routes run without Vapi variables. Never add real values to `.env.example`, source code, or a public repository.

5. Deploy the web service. Render supplies a public URL such as `https://your-service.onrender.com`.

Verify the deployed service:

```powershell
Invoke-RestMethod -Uri 'https://your-service.onrender.com/health'
```

Example public API test:

```powershell
$body = @{ message = 'I sell clothes and want an online store.' } | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri 'https://your-service.onrender.com/api/sessions/render-demo/message' `
  -ContentType 'application/json' -Body $body
```

The server binds to `0.0.0.0` on the `PORT` environment variable, which is required for Render web services. The existing `GET /health` route is production-ready and returns a `200` status when the API is running.

## Vapi live-call webhook

Set this Render environment variable before configuring the Vapi assistant:

```env
PUBLIC_BASE_URL=https://elevatebox-ai-caller.onrender.com
```

The exact Vapi Server URL / webhook URL is:

```text
https://elevatebox-ai-caller.onrender.com/webhooks/vapi
```

In the Vapi dashboard, open the assistant used by `VAPI_ASSISTANT_ID`, set its **Server URL** to that value, and enable these server messages:

- `status-update`
- `transcript`
- `conversation-update`
- `end-of-call-report`

When `PUBLIC_BASE_URL` is set, `POST /api/calls/configure-assistant` also configures that Server URL and those events through the existing Vapi assistant update flow.

The webhook uses Vapi's `message` envelope. It creates a session when a call enters `in-progress`, processes final customer transcripts, safely ignores partial or unknown events, deduplicates repeated customer transcript events, and triggers the existing callback/follow-up flow on call end. Assistant transcripts are acknowledged but are not treated as customer answers.

Simulate a Vapi transcript locally after starting the server:

```powershell
$body = @{
  message = @{
    type = 'transcript'
    call = @{ id = 'local-vapi-demo' }
    role = 'user'
    transcriptType = 'final'
    transcript = 'I sell clothes. My budget is 50000. Can you start next week? Please send the quotation.'
    timestamp = '2026-08-26T10:00:00Z'
  }
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/webhooks/vapi' `
  -ContentType 'application/json' -Body $body
```

To test the deployed endpoint, use the same body with this URL:

```powershell
Invoke-RestMethod -Method Post `
  -Uri 'https://elevatebox-ai-caller.onrender.com/webhooks/vapi' `
  -ContentType 'application/json' -Body $body
```

The local test suite simulates call start, multiple customer transcripts, WARM-to-HOT qualification, one mid-call mock WhatsApp action, callback detection, end-of-call reporting, final follow-up delivery, and duplicate webhook events. No paid phone provider is required.

## Trigger an outbound test call

After filling in all Vapi environment variables, start one call to `TARGET_PHONE_NUMBER`:

```bash
curl -X POST http://localhost:3000/api/calls/start
```

Before the call is created, the endpoint ensures the saved Vapi assistant has the ElevateBox sales prompt and first message. It then reads the destination exclusively from `.env`, creates a Vapi server SDK client with `VAPI_API_KEY`, and sends the saved assistant and originating phone-number IDs to Vapi. A successful response contains Vapi's call `id` and its initial `status`.

Before testing, make sure you are authorized to call the target number and that your Vapi phone number and account are configured for the destination country.

## Exotel outbound calls for India

Set `TELEPHONY_PROVIDER=exotel` to use Exotel for `POST /api/calls/start`; leave it unset or set it to `vapi` to retain the existing Vapi outbound path. Exotel requests use HTTP Basic Auth with `EXOTEL_API_KEY` and `EXOTEL_API_TOKEN`, and call Exotel’s `Calls/connect.json` API using your account SID and configured subdomain. Credentials are never logged.

Configure these Render environment variables:

```env
TELEPHONY_PROVIDER=exotel
EXOTEL_ACCOUNT_SID=
EXOTEL_API_KEY=
EXOTEL_API_TOKEN=
EXOTEL_SUBDOMAIN=api.exotel.com
EXOTEL_CALLER_ID=
EXOTEL_TARGET_NUMBER=
```

Indian numbers are normalized to E.164: `8016178534`, `918016178534`, and `+918016178534` all become `+918016178534`.

After adding your own verified number as `EXOTEL_TARGET_NUMBER`, test one outbound call safely from PowerShell:

```powershell
Invoke-RestMethod -Method Post `
  -Uri 'https://elevatebox-ai-caller.onrender.com/api/calls/start'
```

An Exotel response has this shape:

```json
{
  "provider": "exotel",
  "started": true,
  "callId": "...",
  "status": "queued",
  "error": null
}
```

If Exotel rejects a trial, KYC-restricted, or unauthorized destination, the API returns `started: false` with a safe error message; the server remains running. Automated tests mock Exotel HTTP calls and never place a real call.

## Assistant behavior

The reusable prompt in `src/prompts/sales-agent.prompt.js` instructs the Vapi assistant to introduce ElevateBox naturally, discover the customer’s products, approximate catalogue size, budget, timeline, and needed website features over a natural conversation, and ask only one main question at a time.

It detects the customer’s English, Hindi, or Telugu from their first meaningful reply and continues in that language. It also supports natural English/Hindi and English/Telugu mixing when possible. It does not ask the customer to choose a language.

The prompt deliberately does not classify leads, schedule callbacks, or send WhatsApp messages.

`src/services/conversation.service.js` provides the same discovery flow locally. It is a deterministic, provider-independent service: it reads the current message plus previous customer messages, recalculates the extracted lead data, and returns one concise next question. It supports English, Hindi, Telugu, and common Roman-script Hindi/Telugu mixed with English.

## Lead qualification

`src/services/lead-classification.service.js` classifies a completed conversation as `HOT`, `WARM`, or `COLD`. It evaluates both the full transcript and `leadData`, combining evidence of a real need, budget, timeline, product/features, buying intent, and barriers. A phrase by itself never creates a HOT lead: HOT requires clear need, explicit strong intent, budget, and a short timeline. WARM represents real interest with a barrier or missing readiness details. COLD represents exploratory conversations with no confirmed project intent.

The classifier understands English and common Hinglish signals such as `quotation bhej`, `budget kam`, and `kab shuru`. It does not send WhatsApp messages or schedule callbacks.

Test classification locally:

```bash
curl -X POST http://localhost:3000/api/leads/classify \
  -H "Content-Type: application/json" \
  -d "{\"transcript\":\"I sell clothes online. My budget is 50000 and I need the website in 1 month. Can you start next week? Please send me the quotation.\",\"leadData\":{\"businessType\":\"clothes\",\"productCount\":100,\"budget\":50000,\"timeline\":\"1 month\",\"features\":[\"payment gateway\",\"admin panel\"]}}"
```

The response includes `classification`, `confidence`, a contextual `reason`, the supporting `signals`, and any `barrier`.

## WhatsApp delivery: mock or Meta Cloud API

The existing WhatsApp provider abstraction now supports both local mock delivery and Meta WhatsApp Cloud API delivery.

- Default: leave `WHATSAPP_PROVIDER` unset. Messages are logged and retained in memory; no external request is made.
- Meta: set `WHATSAPP_PROVIDER=meta` and configure all of the following in Render or `.env`:

  ```env
  WHATSAPP_PROVIDER=meta
  WHATSAPP_ACCESS_TOKEN=
  WHATSAPP_PHONE_NUMBER_ID=
  WHATSAPP_API_VERSION=v23.0
  WHATSAPP_RECIPIENT_NUMBER=
  ```

In the Meta App Dashboard, add the WhatsApp product, use its API Setup page to obtain the sender **Phone Number ID**, and create a suitable system-user access token for the app. Add the intended test recipient in Meta before testing. Store the token only in Render’s Environment settings—never in source control.

The service sends text through:

```text
POST https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages
```

with the recipient normalized to digits-only E.164 format. For example, `8688664337` becomes `918688664337`, while `+918688664337` remains `918688664337`.

To send optional architecture/resume media after the final text, set `ARCHITECTURE_IMAGE_PATH` and `RESUME_PATH` to public HTTPS URLs. Meta fetches these URLs directly, so local filesystem paths are skipped with a warning without failing the text follow-up.

For a safe real-message test, set `WHATSAPP_RECIPIENT_NUMBER` to a WhatsApp number you control and have configured as an allowed Meta test recipient. Then trigger one HOT action:

```powershell
$body = @{
  conversationId = 'meta-safe-test-001'
  classification = 'HOT'
  confidence = 0.91
  leadData = @{ businessType = 'clothes'; productCount = 100; budget = 50000; timeline = 'next week'; features = @() }
  transcript = 'I need an online store next week. Please send the quotation.'
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Method Post `
  -Uri 'https://elevatebox-ai-caller.onrender.com/api/actions/evaluate' `
  -ContentType 'application/json' -Body $body
```

The response includes normalized delivery metadata: `provider`, `sent`, `providerMessageId`, and `error`. A provider failure is retained safely and does not crash Vapi webhook processing.

## Mid-call actions

`POST /api/actions/evaluate` decides the next action from an existing classification. It is designed to be called as soon as a mid-call classification is available:

- `HOT` immediately sends one contextual WhatsApp follow-up through the configured provider.
- `WARM` returns `RECOMMEND_CALLBACK`; it does not schedule a callback or send WhatsApp.
- `COLD` returns `LOW_PRIORITY_FOLLOW_UP`; it does not send WhatsApp mid-call.

The mock provider logs the outgoing message and retains delivery state in memory. A `conversationId` can send the high-intent message only once for the lifetime of the running server; the same duplicate protection applies to Meta delivery.

Test it locally without any WhatsApp credentials:

```bash
curl -X POST http://localhost:3000/api/actions/evaluate \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\":\"test-123\",\"classification\":\"HOT\",\"confidence\":0.91,\"leadData\":{\"businessType\":\"clothes\",\"budget\":50000,\"timeline\":\"1 month\",\"features\":[\"payment gateway\"]},\"transcript\":\"I need the website next month. Can you start next week?\"}"
```

Repeat the same request to confirm `triggered` becomes `false`. The provider interface supports `sendMessage`, `sendImage`, and `sendDocument`, so another provider can be added without changing the lead/action flow. No provider credentials are hardcoded.

## Callback scheduling

`POST /api/callbacks/schedule` parses a callback request locally and stores it in memory. It supports English and common Hinglish phrases such as `tomorrow morning`, `today at 6 pm`, `next Monday at 11`, `after two days`, `call me next week`, `kal subah call karna`, `kal shaam`, and `Monday ko 10 baje`.

Daypart defaults are morning at 10:00 AM, afternoon at 3:00 PM, and evening at 6:00 PM. If a phrase has no interpretable date, the endpoint returns `NEEDS_CLARIFICATION` rather than inventing one. A second request for the same `conversationId` returns `ALREADY_SCHEDULED` unless it includes `"update": true`.

Use PowerShell to test it locally:

```powershell
$body = @{
  conversationId = 'test-456'
  requestedTime = 'call me back tomorrow morning'
  timezone = 'Asia/Kolkata'
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/callbacks/schedule' `
  -ContentType 'application/json' -Body $body
```

The scheduler is in-memory only, so callbacks are cleared when the server restarts. A future Google Calendar, queue, or job scheduler can replace the map in `src/services/scheduler.service.js` while keeping this parsing and route contract.

## Contextual post-call follow-ups

`POST /api/followups/generate` creates a natural, local WhatsApp follow-up from the classification, lead data, transcript context, and any scheduled callback. It only mentions known details: business type, product count, budget, timeline, requested features, and callback timing are omitted when absent.

- `HOT` messages focus on next steps and readiness to begin.
- `WARM` messages acknowledge a detected barrier and include the callback time when scheduled.
- `COLD` messages are informational and pressure-free.

`POST /api/followups/send` generates the same message and sends it through the local mock WhatsApp provider. Final follow-ups are deduplicated by `conversationId`; a previous mid-call WhatsApp action does not block the final follow-up.

Set these optional values in `.env` when you want the response metadata to include them:

| Variable | Purpose |
| --- | --- |
| `MY_PHONE_NUMBER` | Your phone number to include as metadata; it is never hardcoded. |
| `RESUME_PATH` | Public HTTPS URL for a resume PDF when using Meta; otherwise optional metadata. |
| `ARCHITECTURE_IMAGE_PATH` | Public HTTPS URL for an architecture image when using Meta; otherwise optional metadata. |

Use PowerShell to generate a local follow-up:

```powershell
$body = @{
  conversationId = 'test-789'
  classification = 'HOT'
  leadData = @{
    businessType = 'clothes'
    productCount = 100
    budget = 50000
    timeline = '1 month'
    features = @('payment gateway', 'admin panel')
  }
  transcript = 'Customer said they sell clothes and need the site within one month.'
  callback = $null
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/followups/generate' `
  -ContentType 'application/json' -Body $body
```

Replace `generate` with `send` to exercise delivery. In Meta mode, the final flow sends contextual text first, then the configured architecture image and resume document. Local tests mock every HTTP request, so `npm test` never sends a real WhatsApp message.

## End-to-end session orchestration

`/api/sessions` coordinates the local conversation, lead classification, mid-call action, callback scheduling, and final follow-up services for one `conversationId`. Each message is appended to in-memory history, its extracted lead data is merged into the session, and classification/action are recalculated immediately.

- A HOT session can trigger one mock mid-call WhatsApp message.
- A callback request in a customer message is parsed and stored with the session.
- `POST /api/sessions/:conversationId/end` mock-sends one contextual final follow-up and marks the session as `ENDED`.
- `GET /api/sessions/:conversationId` returns the retained state.

Run this complete PowerShell demo after `npm run dev`:

```powershell
$conversationId = 'demo-001'

$firstMessage = @{ message = 'I sell clothes and want an online store.' } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/sessions/$conversationId/message" `
  -ContentType 'application/json' -Body $firstMessage

$hotMessage = @{ message = 'My budget is 50000. Can you start next week? Please send the quotation.' } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/sessions/$conversationId/message" `
  -ContentType 'application/json' -Body $hotMessage

Invoke-RestMethod -Method Get `
  -Uri "http://localhost:3000/api/sessions/$conversationId"

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/sessions/$conversationId/end"
```

All orchestration state is in memory and clears when the server restarts. The endpoints do not require Vapi or real WhatsApp credentials.

## Test the local conversation endpoint

Start the server, then send a customer message without configuring or using Vapi:

```bash
curl -X POST http://localhost:3000/api/conversation/message \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"I sell clothes and need a website soon\",\"conversationHistory\":[]}"
```

Example response:

```json
{
  "reply": "That sounds good for an online store. Roughly how many products would you start with—just a few, dozens, or more?",
  "extractedData": {
    "businessType": "clothes",
    "productCount": null,
    "budget": null,
    "timeline": "soon",
    "features": []
  }
}
```

For each following customer turn, send the previous customer and assistant messages in `conversationHistory`. The service rebuilds the lead data from that history, so no local database or real phone call is required.

Run the local conversation checks with:

```bash
npm test
```

## Configure and test the assistant

Use this route to apply the version-controlled ElevateBox prompt and first message to the saved Vapi assistant without placing a phone call:

```bash
curl -X POST http://localhost:3000/api/calls/configure-assistant
```

The operation is idempotent: if the same first message and system prompt are already present, it does not update the assistant again. `POST /api/calls/start` runs this check automatically before it dials.

In Vapi, create or select the assistant referenced by `VAPI_ASSISTANT_ID`, and ensure it has a usable voice, transcriber, and model configuration. This service preserves that existing model/provider configuration and replaces only its system prompt; it also sets the assistant’s first message. You do not need to paste this prompt into the Vapi dashboard when you use the configure endpoint.

To test the conversation in the Vapi dashboard, first call `/api/calls/configure-assistant`, then open **Assistants**, select the configured assistant, and use **Talk**. Reply in English, Hindi, Telugu, or a natural mix and verify that it follows your language and asks one discovery question at a time. You can also use `POST /api/calls/start` to test an actual outbound call to `TARGET_PHONE_NUMBER`.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Confirms that the API is running. |
| POST | `/api/conversation/message` | Locally tests sales replies and lead-data extraction without Vapi or a phone call. |
| POST | `/api/leads/classify` | Qualifies a transcript and extracted lead data as HOT, WARM, or COLD. |
| POST | `/api/actions/evaluate` | Decides a mid-call action and uses mock WhatsApp for HOT leads. |
| POST | `/api/callbacks/schedule` | Parses and stores a local callback appointment. |
| POST | `/api/followups/generate` | Creates a contextual final follow-up without sending it. |
| POST | `/api/followups/send` | Creates and mock-sends one final follow-up per conversation. |
| POST | `/webhooks/vapi` | Receives Vapi lifecycle and transcript events for live-call orchestration. |
| POST | `/api/sessions/:conversationId/message` | Processes one customer turn through the complete local workflow. |
| POST | `/api/sessions/:conversationId/end` | Ends the session and mock-sends its final follow-up. |
| GET | `/api/sessions/:conversationId` | Returns the current in-memory session state. |
| POST | `/api/calls/configure-assistant` | Applies the ElevateBox sales prompt to the saved Vapi assistant. |
| POST | `/api/calls/start` | Starts an outbound Vapi or Exotel call according to `TELEPHONY_PROVIDER`. |
| POST | `/webhooks/call-events` | Placeholder for future call-provider events. |
| POST | `/webhooks/whatsapp-events` | Placeholder for future WhatsApp-provider events. |

## Project structure

```text
src/
  config/       Environment loading and configuration
  controllers/  HTTP request handlers
  models/       Basic Lead and Call data shapes
  prompts/      Reusable assistant instructions
  routes/       Route definitions
  services/     Conversation, qualification, and external integrations
tests/          Local conversation and lead-classification checks
  app.js        Express application setup
  server.js     HTTP server entry point
```
