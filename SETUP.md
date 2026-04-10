# Setup Instructions

## Quick Start

1. **Create `.env.local` file** in the root directory:
   ```env
   VITE_CONVEX_URL=your_convex_url_here
   ```

2. **Set the backend OpenAI key in Convex**:
   ```bash
   npx convex env set OPENAI_API_KEY your_openai_api_key_here
   ```

3. **Generate PWA icons:**
   ```bash
   # Open public/icon-preview.html in a browser
   # Take screenshots and save as icon-{size}.png
   # Or use an online tool: https://realfavicongenerator.net/
   ```

4. **Install and run:**
   ```bash
   npm install
   npm run dev
   ```

## What Changed

### 1. OpenAI GPT-4 Vision Integration
- Replaced Gemini API with OpenAI GPT-4 Vision
- Server-side proxying through Convex using `OPENAI_API_KEY`
- Direct base64 encoding from canvas with secure backend forwarding

### 2. Live Camera Monitoring
- Continuous webcam feed with automatic frame capture
- Analysis every 3 seconds
- Real-time visual alerts with color-coded overlays

### 3. Multi-State Detection
- **Drunk/Intoxicated**: Red overlay, detects alcohol-related signs
- **Sleepy/Fatigued**: Orange overlay, detects drowsiness signs
- **Distracted**: Yellow overlay, detects attention issues

### 4. PWA Support
- Added `manifest.json` for app installation
- Service worker for offline caching
- Icon support for home screen installation

### 5. UI Updates
- Removed all gradients
- Solid slate/blue color scheme
- Clean, modern design

### 6. Browser Notifications
- Desktop notification when impairment detected
- Toast alerts for quick feedback

## Configuration Options

### Change Analysis Interval
Edit `src/DrunkDetector.tsx`:
```typescript
intervalRef.current = setInterval(() => {
  analyzeCurrentFrame();
}, 3000); // Change to desired milliseconds
```

### Change Confidence Threshold
Edit `src/DrunkDetector.tsx`:
```typescript
if ((result.isDrunk || result.isSleepy || result.isDistracted) && result.confidence >= 50) {
  // Change 50 to your threshold (0-100)
}
```

## Testing

1. Grant camera permissions when prompted
2. Click "Start Monitoring"
3. The app will analyze every 3 seconds
4. Try different facial expressions to test detection
5. Check console logs for detailed analysis results

## Deployment

For production deployment:
1. Update Convex deployment URL in `.env.local`
2. Set `OPENAI_API_KEY` in Convex for the production deployment
3. Generate proper PWA icons (replace placeholders)
4. Test service worker functionality
5. Deploy to your hosting platform

## iOS Packaging

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the web bundle:
   ```bash
   npm run build
   ```
3. Create the iOS project:
   ```bash
   npm run ios:add
   ```
4. Sync the latest web assets:
   ```bash
   npm run cap:sync:ios
   ```
5. Open the native project in Xcode:
   ```bash
   npm run ios:open
   ```
6. In Xcode, set signing, verify camera and location permission strings, then run on a physical iPhone.

## Troubleshooting

**Camera not working:**
- Check browser permissions
- Ensure HTTPS in production (required for camera access)

**OpenAI API errors:**
- Verify `OPENAI_API_KEY` is set in Convex
- Check API quota/billing
- Review console logs for detailed errors

**Icons not showing:**
- Generate proper icon files using `icon-preview.html`
- Ensure icons are in `public` folder
- Check manifest.json paths

**Notifications not working:**
- Browser may block notifications initially
- Check browser notification settings
- Ensure notification permission is granted
