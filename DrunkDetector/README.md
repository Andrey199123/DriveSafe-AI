# SafeDrive AI Detector - PWA

An AI-powered Progressive Web App (PWA) for real-time impairment detection using OpenAI GPT-4 Vision.

## Features

- 🎥 **Live Camera Monitoring**: Continuous webcam monitoring with real-time analysis
- 🤖 **AI-Powered Detection**: Uses OpenAI GPT-4 Vision API for accurate impairment detection
- 🚨 **Multi-State Detection**: Detects drunk, sleepy, and distracted states
- 📱 **PWA Support**: Install as a native app on mobile and desktop
- 🔔 **Browser Notifications**: Real-time alerts when impairment is detected
- 🎨 **Clean UI**: Modern design with solid slate/blue color scheme

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Convex account ([Get one here](https://www.convex.dev))

## Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_CONVEX_URL=your_convex_url_here
   VITE_OPENAI_API_KEY=your_openai_api_key_here
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
3. **AI Detection**: Each frame is analyzed by OpenAI GPT-4 Vision for:
   - Intoxication signs (bloodshot eyes, facial flushing, etc.)
   - Sleepiness signs (heavy eyelids, droopy expression, etc.)
   - Distraction signs (looking away, phone usage, etc.)
4. **Real-time Alerts**: When impairment is detected (confidence ≥50%), the app shows:
   - Red/orange/yellow overlay on the video feed
   - Browser notification
   - Toast alert
   - Visual status indicators

## API Usage

The app uses OpenAI GPT-4 Vision API with the following configuration:
- **Model**: `gpt-4o`
- **Confidence Threshold**: 50%
- **Analysis Interval**: Every 3 seconds
- **Image Format**: Base64 encoded JPEG from canvas capture

## PWA Installation

### Desktop:
1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. Follow the prompts to install

### Mobile (iOS):
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
- **Backend**: Convex (for authentication only)
- **AI**: OpenAI GPT-4 Vision API
- **PWA**: Service Worker + Manifest

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
