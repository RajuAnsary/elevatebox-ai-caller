# ElevateBox AI Caller API

Node.js and Express backend foundation for an AI outbound sales calling system. The project keeps its Vapi integration, while the Stage 3 conversation logic can be tested locally without placing a phone call.

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
   | `MY_PHONE_NUMBER` | Optional | Follow-up metadata only. |
   | `RESUME_PATH` | Optional | Resume attachment metadata only. |
   | `ARCHITECTURE_IMAGE_PATH` | Optional | Architecture-image attachment metadata only. |

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

## Trigger an outbound test call

After filling in all Vapi environment variables, start one call to `TARGET_PHONE_NUMBER`:

```bash
curl -X POST http://localhost:3000/api/calls/start
```

Before the call is created, the endpoint ensures the saved Vapi assistant has the ElevateBox sales prompt and first message. It then reads the destination exclusively from `.env`, creates a Vapi server SDK client with `VAPI_API_KEY`, and sends the saved assistant and originating phone-number IDs to Vapi. A successful response contains Vapi's call `id` and its initial `status`.

Before testing, make sure you are authorized to call the target number and that your Vapi phone number and account are configured for the destination country.

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

## Mid-call actions and mock WhatsApp

`POST /api/actions/evaluate` decides the next action from an existing classification. It is designed to be called as soon as a mid-call classification is available:

- `HOT` immediately sends one contextual WhatsApp follow-up through the local mock provider.
- `WARM` returns `RECOMMEND_CALLBACK`; it does not schedule a callback or send WhatsApp.
- `COLD` returns `LOW_PRIORITY_FOLLOW_UP`; it does not send WhatsApp mid-call.

The mock WhatsApp provider logs the outgoing message and retains delivery state in memory. A `conversationId` can send the high-intent message only once for the lifetime of the running server.

Test it locally without any WhatsApp credentials:

```bash
curl -X POST http://localhost:3000/api/actions/evaluate \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\":\"test-123\",\"classification\":\"HOT\",\"confidence\":0.91,\"leadData\":{\"businessType\":\"clothes\",\"budget\":50000,\"timeline\":\"1 month\",\"features\":[\"payment gateway\"]},\"transcript\":\"I need the website next month. Can you start next week?\"}"
```

Repeat the same request to confirm `triggered` becomes `false`. To later use Twilio WhatsApp, Meta Cloud API, or another provider, implement a provider object with `sendMessage({ conversationId, message })` and register it through `setWhatsAppProvider`. No provider credentials are hardcoded.

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
| `RESUME_PATH` | Local path or future provider URL for a resume attachment. |
| `ARCHITECTURE_IMAGE_PATH` | Local path or future provider URL for an architecture-image attachment. |

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

Replace `generate` with `send` to exercise the mock delivery. The response includes attachment metadata. A real provider adapter can later upload or map these paths to provider-specific media IDs, then pass them through the existing `sendMessage` provider contract.

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
| POST | `/api/sessions/:conversationId/message` | Processes one customer turn through the complete local workflow. |
| POST | `/api/sessions/:conversationId/end` | Ends the session and mock-sends its final follow-up. |
| GET | `/api/sessions/:conversationId` | Returns the current in-memory session state. |
| POST | `/api/calls/configure-assistant` | Applies the ElevateBox sales prompt to the saved Vapi assistant. |
| POST | `/api/calls/start` | Starts an outbound Vapi call to `TARGET_PHONE_NUMBER`. |
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
