# DriveSafe AI

An AI-powered Progressive Web Application for real-time driver impairment detection using advanced vision models. Built with Convex for secure authentication and server-side AI proxying.

## Features

- **Live Camera Monitoring**: Continuous webcam monitoring with real-time analysis
- **AI-Powered Detection**: Advanced vision analysis for driver safety assessment
- **Multi-State Detection**: Identifies signs of impairment, drowsiness, and distraction
- **Progressive Web App**: Installable as a native application on mobile and desktop platforms
- **Real-Time Notifications**: Browser notifications when impairment is detected
- **Modern Interface**: Clean, professional design optimized for driver safety

## Prerequisites

- Node.js 18 or higher with npm
- OpenAI API key (obtain from [OpenAI Platform](https://platform.openai.com/api-keys))
- Convex account (sign up at [convex.dev](https://www.convex.dev))
- Xcode 16 or higher (required for iOS packaging)

## Setup

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration

2. Create a `.env.local` file in the root directory:
   ```env
   VITE_CONVEX_URL=your_convex_url_here
   ```

3. Configure the OpenAI API key on the Convex backend (ensures the key remains secure and never ships to the client):
   ```bash
   npx convex env set OPENAI_API_KEY your_openai_api_key_here
   ```

### PWA Icon Generation

4. Generate Progressive Web App icons:
   - Open `public/icon-preview.html` in a web browser
   - Capture screenshots for each required icon size: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
   - Save files as `icon-{size}.png` in the `public` directory
   - Alternatively, use an online tool such as [RealFaviconGenerator](https://realfavicongenerator.net/)

### Development Server

5. Start the development environment:
   ```bash
   npm run dev
   ```
   This command launches:
   - Frontend development server at `http://localhost:5173`
   - Convex backend services

## How It Works

### Monitoring Process

1. **Initiate Monitoring**: Click "Start Monitoring" to activate camera access
2. **Automated Analysis**: The application captures video frames at regular intervals (every 3 seconds)
3. **AI Detection**: Each frame undergoes analysis to identify:
   - Alcohol-related visual indicators (bloodshot eyes, facial flushing, coordination issues)
   - Signs of drowsiness (heavy eyelids, drooping expression, reduced alertness)
   - Distraction indicators (diverted attention, device usage, lack of focus)
4. **Alert System**: When impairment is detected with confidence threshold of 50% or higher, the system triggers:
   - Color-coded visual overlay on the video feed (red/orange/yellow based on severity)
   - Browser notification alert
   - Toast notification message
   - Status indicator updates

## API Configuration

The application utilizes OpenAI's vision API through a secure server-side Convex action with the following specifications:

- **Model**: gpt-4o
- **Confidence Threshold**: 50%
- **Analysis Interval**: 3 seconds
- **Image Format**: Base64-encoded JPEG from canvas capture
- **Security**: API key (`OPENAI_API_KEY`) is stored server-side and never exposed in the client bundle

## iOS Packaging

### Build Process

1. Install project dependencies:
   ```bash
   npm install
   ```

2. Build the web application:
   ```bash
   npm run build
   ```

3. Generate the iOS project structure (first-time setup):
   ```bash
   npm run ios:add
   ```

4. Synchronize web assets with the native iOS shell:
   ```bash
   npm run cap:sync:ios
   ```

5. Open the project in Xcode:
   ```bash
   npm run ios:open
   ```

### Important Notes

- Testing requires a physical iPhone device for camera access and permission handling
- The Capacitor bundle identifier in `capacitor.config.ts` is a placeholder
- Replace with your production reverse-DNS identifier before deployment

## Progressive Web App Installation

### Desktop Installation (Chrome/Edge)

1. Navigate to the application in your browser
2. Click the install icon in the address bar
3. Follow the installation prompts

### iOS Installation (Safari)

1. Open Safari and navigate to the application
2. Tap the Share button
3. Select "Add to Home Screen"
4. Confirm the installation

### Android Installation (Chrome)

1. Open Chrome and navigate to the application
2. Tap the menu icon (three vertical dots)
3. Select "Add to Home Screen" or "Install App"
4. Confirm the installation

## Configuration Options

### Detection Sensitivity

Modify the confidence threshold in `src/DrunkDetector.tsx`:

```typescript
if ((result.isDrunk || result.isSleepy || result.isDistracted) && result.confidence >= 50) {
  // Adjust the threshold value (50) as needed
}
```

### Analysis Interval

Adjust the frame capture interval in `src/DrunkDetector.tsx`:

```typescript
intervalRef.current = setInterval(() => {
  analyzeCurrentFrame();
}, 3000); // Modify interval in milliseconds (default: 3000ms)
```

## Technology Stack

- **Frontend Framework**: React with TypeScript and Vite
- **Styling**: Tailwind CSS
- **Backend Services**: Convex (authentication and secure AI proxy)
- **AI Model**: OpenAI GPT-4o vision analysis
- **Progressive Web App**: Service Worker with Web App Manifest
- **Native Wrapper**: Capacitor for iOS deployment

## License

MIT License

## Support

For issues, questions, or feature requests, please open an issue on the GitHub repository.
