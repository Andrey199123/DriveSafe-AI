# DriveSafe AI Detector - PWA + iOS Wrapper

An AI-powered Progressive Web App (PWA) for real-time impairment detection using OpenAI vision models, with Convex handling auth and secure server-side AI proxying.

## Features

- 🎥 **Live Camera Monitoring**: Continuous webcam monitoring with real-time analysis
- 🤖 **AI-Powered Detection**: Uses OpenAI vision analysis for driver-safety cues
- 🚨 **Multi-State Detection**: Detects drunk, sleepy, and distracted states
- 📱 **PWA Support**: Install as a native app on mobile and desktop
- 🔔 **Browser Notifications**: Real-time alerts when impairment is detected
- 🎨 **Clean UI**: Modern design with solid slate/blue color scheme

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Convex account ([Get one here](https://www.convex.dev))
- Xcode 16+ for iOS packaging

## Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_CONVEX_URL=your_convex_url_here
   ```

   Then set the OpenAI key on the Convex backend so it never ships to the client:
   ```bash
   npx convex env set OPENAI_API_KEY your_openai_api_key_here
   ```

3. **Generate PWA icons:**
   - Open `public/icon-preview.html` in a browser
   - Take screenshots of each icon size (72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512)
   - Save them as `icon-{size}.png` in the `public` folder
   - Or use an online tool like [RealFaviconGenerator](https://realfavicongenerator.net/)

4. **Start development servers:**
   ```bash
   npm run dev
   ```
   This will start:
   - Frontend on `http://localhost:5173`
   - Convex backend

## How It Works

1. **Start Monitoring**: Click "Start Monitoring" to activate the camera
2. **Automatic Analysis**: The app captures frames every 3 seconds
3. **AI Detection**: Each frame is analyzed for possible:
   - Alcohol-related visual cues (bloodshot eyes, facial flushing, etc.)
   - Sleepiness signs (heavy eyelids, droopy expression, etc.)
   - Distraction signs (looking away, phone usage, etc.)
4. **Real-time Alerts**: When impairment is detected (confidence ≥50%), the app shows:
   - Red/orange/yellow overlay on the video feed
   - Browser notification
   - Toast alert
   - Visual status indicators

## API Usage

The app uses OpenAI through a server-side Convex action with the following configuration:
- **Model**: `gpt-4o`
- **Confidence Threshold**: 50%
- **Analysis Interval**: Every 3 seconds
- **Image Format**: Base64 encoded JPEG from canvas capture
- **Key handling**: `OPENAI_API_KEY` stays on the backend and is not exposed in the Vite bundle

## iOS Packaging

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the web app:
   ```bash
   npm run build
   ```
3. Generate the iOS project once:
   ```bash
   npm run ios:add
   ```
4. Sync the latest web assets into the native shell:
   ```bash
   npm run cap:sync:ios
   ```
5. Open Xcode:
   ```bash
   npm run ios:open
   ```

Use a physical iPhone for camera and permission testing. The Capacitor bundle identifier in [capacitor.config.ts](/Users/nikolay/Downloads/DriveSafe-AI-main/capacitor.config.ts) is a placeholder and should be replaced with your production reverse-DNS ID before shipping.

## PWA Installation

### Desktop:
1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. Follow the prompts to install

### Mobile (iOS Safari):
1. Open Safari and navigate to the app
2. Tap the Share button
3. Select "Add to Home Screen"

### Mobile (Android):
1. Open Chrome and navigate to the app
2. Tap the menu (three dots)
3. Select "Add to Home Screen" or "Install App"

## Configuration

### Modify Detection Sensitivity
Edit the confidence threshold in `src/DrunkDetector.tsx`:
```typescript
if ((result.isDrunk || result.isSleepy || result.isDistracted) && result.confidence >= 50) {
  // Change 50 to your desired threshold
}
```

### Modify Analysis Interval
Edit the interval in `src/DrunkDetector.tsx`:
```typescript
intervalRef.current = setInterval(() => {
  analyzeCurrentFrame();
}, 3000); // Change 3000 to your desired interval in milliseconds
```

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS
- **Backend**: Convex (auth + secure AI proxy)
- **AI**: OpenAI GPT-4o vision analysis
- **PWA**: Service Worker + Manifest
- **Native wrapper**: Capacitor for iOS

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
