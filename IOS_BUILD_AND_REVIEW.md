# iOS Build and App Review Notes

## Backend and Secrets

- The OpenAI API key is no longer read from the Vite frontend.
- Store `OPENAI_API_KEY` in Convex with:
  ```bash
  npx convex env set OPENAI_API_KEY your_openai_api_key_here
  ```
- Keep `.env.local` limited to client-safe values:
  ```env
  VITE_CONVEX_URL=your_convex_url_here
  ```

## iOS Build Steps

1. Install dependencies:
   ```bash
   npm install
   ```
2. Generate Convex types and ensure your deployment is configured:
   ```bash
   npx convex dev
   ```
3. Build the Vite web bundle:
   ```bash
   npm run build
   ```
4. Add the iOS shell once:
   ```bash
   npm run ios:add
   ```
5. Sync the web bundle into iOS:
   ```bash
   npm run cap:sync:ios
   ```
6. Open Xcode:
   ```bash
   npm run ios:open
   ```
7. In Xcode, pick the `App` target, set your Team and bundle identifier, choose a connected iPhone, then click Run.

## Native Permissions

The generated iOS app now includes these usage descriptions in [Info.plist](/Users/nikolay/Downloads/DriveSafe-AI-main/ios/App/App/Info.plist):

- Camera access for live driver monitoring
- Location access for speed and speed-limit comparison
- Photo library access for optional image and video uploads

## Review Risks To Address Before Submission

- The app currently makes impairment-related judgments from camera imagery. Position it as a driver-safety aid, not a medical, sobriety, or law-enforcement determination.
- Claims like "drunk detected" or "accurate impairment detection" are high-risk without strong validation, disclaimers, and supporting evidence.
- The app sends camera-derived frames to OpenAI for analysis. Your privacy policy and App Privacy answers need to disclose the data flows accurately.
- Location data is used for speed-limit comparison, so the App Privacy questionnaire may need location disclosures depending on whether you retain or link that data.
- If you keep browser-style notifications instead of native push/local notifications, test the in-app alert behavior carefully on iOS because WebView behavior differs from Safari.
- Missing polished app icons, onboarding, and explanation screens can make review harder even if the core tech works.
