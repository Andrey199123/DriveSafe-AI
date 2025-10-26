# Setup Instructions

## Quick Start

1. **Create `.env.local` file** in the root directory:
   ```env
   VITE_CONVEX_URL=your_convex_url_here
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **Generate PWA icons:**
   ```bash
   # Open public/icon-preview.html in a browser
   # Take screenshots and save as icon-{size}.png
   # Or use an online tool: https://realfavicongenerator.net/
   ```

3. **Install and run:**
   ```bash
   npm install
   npm run dev
   ```

## What Changed

### 1. OpenAI GPT-4 Vision Integration
- Replaced Gemini API with OpenAI GPT-4 Vision
- Client-side API calls using `VITE_OPENAI_API_KEY`
- Direct base64 encoding from canvas (no Convex uploads)

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
2. Generate proper PWA icons (replace placeholders)
3. Test service worker functionality
4. Deploy to your hosting platform

## Troubleshooting

**Camera not working:**
- Check browser permissions
- Ensure HTTPS in production (required for camera access)

**OpenAI API errors:**
- Verify API key is set in `.env.local`
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
