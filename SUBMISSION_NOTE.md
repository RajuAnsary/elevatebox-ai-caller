# Final Assignment Note

I built an AI voice sales assistant for e-commerce website leads using Vapi, Node.js/Express, Render, and Meta WhatsApp Cloud API.

The system handles live voice conversations, extracts business type, product count, budget, timeline, features, and buying intent, then classifies the lead as HOT, WARM, or COLD. HOT leads trigger a real WhatsApp message while the call is still active. WARM leads can be scheduled for callbacks from spoken phrases such as “tomorrow morning.” After the call, the system sends a contextual WhatsApp follow-up containing the actual discussion, my mobile number, architecture image, and resume.

I added handling for partial Vapi transcripts, duplicate events, spoken-number normalization, contextual follow-ups, and duplicate action protection.

Working now: live Vapi conversation, lead extraction, classification, callback parsing, real Meta WhatsApp mid-call action, and final contextual follow-up with media.

Current limitation: autonomous outbound PSTN calling to the target Indian number requires an international-capable telephony provider/number. The call orchestration endpoint is already implemented and provider-ready.

## Current limitation

The complete AI conversation, lead classification, callback logic, real Meta WhatsApp mid-call action, and contextual final follow-up are working.

Autonomous outbound PSTN calling to the final Indian target number is provider-limited in the current free setup. Vapi requires an international-capable telephony number, Exotel requires business KYC for outbound calling, and I intentionally did not use paid infrastructure. The outbound-call orchestration layer is implemented and provider-ready.
