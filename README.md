# DriveSafe AI

**A camera-monitoring prototype exploring computer vision, real-time interfaces, and server-side AI integration.**

[Explore the app](https://drivesafe-ai.vercel.app) · [Congressional App Challenge recognition](https://www.congressionalappchallenge.us/25-FL25/)

DriveSafe AI received a Congressional App Challenge district award. The project combines a live camera interface with periodic frame analysis, visual feedback, Convex actions, and configurable vision providers. It also includes authentication, provider settings, detection records, usage controls, PWA support, and an iOS packaging path.

> **Research prototype, not a validated safety device.** A camera frame cannot establish intoxication or fitness to drive. Model labels and confidence values are not medical measurements or calibrated safety probabilities. Never operate this app while driving or rely on it to decide whether to drive.

## Engineering

- [Camera interface](src/DrunkDetector.tsx) - capture, monitoring, and feedback.
- [Server-side analysis](convex/ai.ts) - vision-provider integration through Convex.
- [MicroDC provider](convex/microdcVision.ts) - optional provider and response handling.
- [Data model](convex/schema.ts) and [routing](src/router.tsx).
- [Service worker](public/sw.js) - progressive web app support.

The public repository shows the application workflow and its integration boundaries. The browser captures frames, sends them to a configured server-side provider, and displays the provider's response. Provider output remains experimental and is not evidence of impairment, intoxication, or safe driving ability.

## Recognition

DriveSafe AI was selected as the district winner of the Congressional App Challenge. The public app is available at [drivesafe-ai.vercel.app](https://drivesafe-ai.vercel.app).

## Privacy and limitations

When a cloud provider is selected, submitted frames are transmitted to that provider. Do not use sensitive or third-party footage for a public demonstration, and obtain consent from anyone who appears in a frame. Review the provider's data-handling terms before using the application.

Lighting, camera position, occlusion, and model errors affect the output. This project demonstrates an end-to-end software workflow; it does not establish sensitivity, specificity, a validated impairment threshold, or road-safety performance.
