# DriveSafe AI

**A camera-based driver-monitoring prototype exploring computer vision, real-time interfaces, and server-side AI integration.**

[Explore the app](https://drivesafe-ai.vercel.app) · [Congressional App Challenge recognition](https://www.congressionalappchallenge.us/25-FL25/)

Built by Andrey Vasilyev. The project received a Congressional App Challenge district award.

> **Research prototype—not a validated safety device.** A camera frame cannot establish intoxication or fitness to drive. Model labels and confidence values are not medical measurements or calibrated safety probabilities. Never operate this app while driving or rely on it to decide whether to drive.

## What you can explore

- A live-camera interface with periodic frame analysis and visual feedback.
- Server-side vision calls through Convex, keeping provider keys outside the browser bundle.
- Authentication, provider settings, detection records, and usage controls.
- An installable progressive web app, with Capacitor configuration for iOS packaging.
- Automated tests covering backend behavior, routing, keyboard navigation, and accessibility.

## Engineering entry points

- [Camera interface](src/DrunkDetector.tsx): capture, monitoring, and feedback.
- [Server-side analysis](convex/ai.ts): vision-provider integration.
- [MicroDC provider](convex/microdcVision.ts): optional provider and response handling.
- [Data model](convex/schema.ts) and [routing](src/router.tsx).
- [Service worker](public/sw.js): PWA support.

The workflow captures frames, submits them to a configured server-side provider, and displays its response. Legacy providers include impairment-related labels; these are unvalidated hypotheses, not evidence of intoxication. The MicroDC provider is restricted to visible observations such as closed eyes or looking away and leaves legacy impairment flags unset.

## Local development

Requires Node.js 18+ with npm and a Convex development deployment. Provider-backed analysis also requires credentials for the selected provider.

```bash
git clone https://github.com/Andrey199123/DriveSafe-AI.git
cd DriveSafe-AI
npm ci
```

Configure your own development deployment with `npx convex dev` and set `VITE_CONVEX_URL` in `.env.local` (see [.env.example](.env.example)). Configure authentication and provider secrets in **your development backend**, not in client code or committed files.

```bash
npm run dev
```

The development script starts Vite and the Convex development process. Use `npm run dev:frontend` to run only Vite against an already configured backend.

```bash
npm test
npm run build
```

These run the automated suite and frontend build; they do not establish road-safety performance. The `lint` script also invokes Convex deployment tooling; inspect it before running against a connected environment.

## Maintenance helpers

Optional utilities live in `scripts/` rather than the repository root:

- `node scripts/setup-auth.mjs`: interactive Convex Auth setup; run from the repository root against your own development environment.
- `node scripts/generate-icons.cjs`: regenerates the placeholder icon-preview HTML, not production PNG assets. This overwrites `public/icon-preview.html`.

## Optional MicroDC provider

The backend supports `qwen2.5vl:7b` through MicroDC's OpenAI-compatible API. Configure `MICRODC_API_KEY` securely in Convex; `MICRODC_BASE_URL` may override the default `https://api.microdc.ai/v1` with another HTTPS endpoint. Deploy the backend before selecting this provider in authenticated settings.

**Privacy:** selecting a cloud provider transmits submitted frames to that provider. Obtain informed consent from anyone in frame and review the provider's data-handling terms. Do not use sensitive or third-party footage for a public demonstration.

## Limitations

Lighting, camera position, occlusion, and model errors affect outputs. The repository does not establish sensitivity, specificity, or a validated impairment threshold. This project demonstrates an end-to-end software workflow, not a certified driver-monitoring product.
