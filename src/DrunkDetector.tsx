import { useState, useRef, useEffect } from "react";
import { haversineDistanceMeters, mpsToMph, parseMaxspeedToMph } from "./lib/utils";
import { toast } from "sonner";

interface DetectionResult {
  isDrunk: boolean;
  isSleepy: boolean;
  isDistracted: boolean;
  confidence: number;
  indicators: string[];
  state: "drunk" | "sleepy" | "distracted" | "normal";
}

export function DrunkDetector() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<DetectionResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastAlertTimeRef = useRef<number>(0);
  const lastSpeedAlertTimeRef = useRef<number>(0);
  const geoWatchIdRef = useRef<number | null>(null);
  const lastGeoSampleRef = useRef<{ lat: number; lon: number; t: number } | null>(null);
  const lastLimitFetchRef = useRef<number>(0);
  const [currentSpeedMph, setCurrentSpeedMph] = useState<number | null>(null);
  const [speedLimitMph, setSpeedLimitMph] = useState<number | null>(null);
  const geoPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
      if (geoPollIntervalRef.current) {
        clearInterval(geoPollIntervalRef.current);
      }
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Geolocation and speed tracking
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const handlePosition = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lon, speed } = pos.coords;
      const timestamp = pos.timestamp;

      if (typeof speed === 'number' && !Number.isNaN(speed)) {
        setCurrentSpeedMph(Math.max(0, Math.round(mpsToMph(speed) * 10) / 10));
      } else if (lastGeoSampleRef.current) {
        const dt = (timestamp - lastGeoSampleRef.current.t) / 1000;
        if (dt > 0) {
          const dist = haversineDistanceMeters(lastGeoSampleRef.current.lat, lastGeoSampleRef.current.lon, lat, lon);
          const v = dist / dt; // m/s
          setCurrentSpeedMph(Math.max(0, Math.round(mpsToMph(v) * 10) / 10));
        }
      }
      lastGeoSampleRef.current = { lat, lon, t: timestamp };

      const now = Date.now();
      if (now - lastLimitFetchRef.current > 30000 || speedLimitMph == null) {
        lastLimitFetchRef.current = now;
        fetchSpeedLimit(lat, lon).catch(() => {});
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    geoWatchIdRef.current = watchId;

    // Polling fallback to keep HUD lively on browsers that throttle watchPosition
    geoPollIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        handlePosition,
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }, 1000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (geoPollIntervalRef.current) clearInterval(geoPollIntervalRef.current);
    };
  }, []);

  const fetchSpeedLimit = async (lat: number, lon: number) => {
    try {
      // Overpass: find nearby ways with maxspeed within ~60m
      const query = `[out:json][timeout:10];way(around:60,${lat},${lon})["maxspeed"];out tags center;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const elements = Array.isArray(data.elements) ? data.elements : [];
      let bestLimit: number | null = null;
      for (const el of elements) {
        const raw = el?.tags?.maxspeed as string | undefined;
        if (!raw) continue;
        const mph = parseMaxspeedToMph(raw);
        if (mph) {
          bestLimit = mph;
          break;
        }
      }
      if (bestLimit !== null) setSpeedLimitMph(Math.round(bestLimit));
    } catch {}
  };

  // Overspeed alerts
  useEffect(() => {
    if (currentSpeedMph == null || speedLimitMph == null) return;
    if (currentSpeedMph > speedLimitMph) {
      const now = Date.now();
      if (now - lastSpeedAlertTimeRef.current > 60000) {
        lastSpeedAlertTimeRef.current = now;
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("⚠️ Over Speed Limit", {
              body: `Speed ${Math.round(currentSpeedMph)}mph > Limit ${speedLimitMph}mph. Slow down.`,
              icon: "/icon-192.png",
              tag: "overspeed-alert",
            });
          }
        } catch {}
        toast.error("⚠️ Over speed limit — slow down");
        playAlertSound();
        speakAlert("Slow down. You are over the speed limit.");
      }
    }
  }, [currentSpeedMph, speedLimitMph]);


  const getBase64FromCanvas = (): string => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return "";

    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Use consistent dimensions for better analysis
    const width = Math.min(video.videoWidth, 640);
    const height = Math.min(video.videoHeight, 480);
    
    canvas.width = width;
    canvas.height = height;
    
    // Improve image quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, width, height);
    
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Stop live monitoring if active
    if (isMonitoring) {
      stopMonitoring();
    }

    // Reset previous media
    if (uploadedVideo) URL.revokeObjectURL(uploadedVideo);
    if (uploadedImage) URL.revokeObjectURL(uploadedImage);
    setUploadedVideo(null);
    setUploadedImage(null);
    setCurrentResult(null);

    if (file.type.startsWith('video/')) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Video file is too large. Please select a file under 50MB.');
        return;
      }
      const url = URL.createObjectURL(file);
      setUploadedVideo(url);
      setIsVideoMode(true);
      toast.success('Video uploaded successfully!');
      return;
    }

    if (file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image file is too large. Please select an image under 10MB.');
        return;
      }
      const url = URL.createObjectURL(file);
      setUploadedImage(url);
      setIsVideoMode(false);
      toast.success('Image uploaded successfully!');
      return;
    }

    toast.error('Unsupported file type. Please upload a video or image.');
  };

  const analyzeUploadedVideo = async () => {
    if (!videoRef.current || !uploadedVideo) return;

    setIsAnalyzing(true);
    try {
      // Seek to a specific time (e.g., 2 seconds into the video)
      videoRef.current.currentTime = 2;
      
      // Wait for the video to load the frame
      await new Promise((resolve) => {
        if (videoRef.current) {
          videoRef.current.onseeked = resolve;
        }
      });

      const base64Image = getBase64FromCanvas();
      if (!base64Image) {
        throw new Error("Failed to capture frame from video");
      }

      const result = await analyzeImageWithOpenAI(base64Image);
      setCurrentResult(result);
      
      if ((result.isDrunk || result.isSleepy || result.isDistracted) && result.confidence >= 30) {
        toast.error(`⚠️ ${result.state.toUpperCase()} detected in video!`);
      } else {
        toast.success('Video analysis complete - no impairment detected');
      }
    } catch (error) {
      console.error("Video analysis failed:", error);
      toast.error("Failed to analyze video");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeUploadedImage = async () => {
    if (!uploadedImage || !canvasRef.current) return;

    setIsAnalyzing(true);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = uploadedImage;
      });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      const width = Math.min(img.width, 640);
      const height = Math.min(img.height, 480);
      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const base64Image = canvas.toDataURL('image/jpeg', 0.9);
      const result = await analyzeImageWithOpenAI(base64Image);
      setCurrentResult(result);

      if ((result.isDrunk || result.isSleepy || result.isDistracted) && result.confidence >= 30) {
        toast.error(`⚠️ ${result.state.toUpperCase()} detected in image!`);
      } else {
        toast.success('Image analysis complete - no impairment detected');
      }
    } catch (error) {
      console.error('Image analysis failed:', error);
      toast.error('Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearUploadedVideo = () => {
    if (uploadedVideo) {
      URL.revokeObjectURL(uploadedVideo);
    }
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage);
    }
    setUploadedVideo(null);
    setUploadedImage(null);
    setIsVideoMode(false);
    setCurrentResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const analyzeImageWithOpenAI = async (base64Image: string): Promise<DetectionResult> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not found in environment variables");
    }

    if (!apiKey.startsWith('sk-')) {
      throw new Error("Invalid OpenAI API key format - should start with 'sk-'");
    }

    console.log("Starting OpenAI analysis...", `API key: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a computer vision system that analyzes images and returns structured data about visual features. Focus only on observable visual characteristics."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Perform computer vision analysis on this image to detect facial and eye characteristics. Return ONLY a JSON object with these visual observations:
{
  "eyesRed": true or false,
  "eyesGlassy": true or false,
  "eyesHalfClosed": true or false,
  "eyesClosed": true or false,
  "faceRed": true or false,
  "lookingAway": true or false,
  "confidence": number 0-100
}

Detect these visual features:
- eyesRed: Are the eyes red in color?
- eyesGlassy: Do the eyes have a glassy/reflective appearance?
- eyesHalfClosed: Are the eyelids partially closed?
- eyesClosed: Are the eyes completely closed?
- faceRed: Is the face flushed or red?
- lookingAway: Is the person looking away from the camera?
- confidence: Your confidence in these visual observations (0-100)

Return ONLY the JSON object.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Image,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      // Log specific error types
      if (response.status === 429) {
        console.error("Rate limited by OpenAI - try increasing interval");
      } else if (response.status === 400) {
        console.error("Bad request - possibly content filter");
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Full OpenAI response:", result);
    
    const message = result.choices?.[0]?.message;
    const content = message?.content;
    const refusal = message?.refusal;
    
    console.log("OpenAI message content:", content);
    
    // Check for refusal first
    if (refusal) {
      console.error("OpenAI refused the request:", refusal);
      throw new Error(`OpenAI refused the request: ${refusal}`);
    }
    
    if (!content) {
      console.error("OpenAI response breakdown:");
      console.error("- choices array:", result.choices);
      console.error("- first choice:", result.choices?.[0]);
      console.error("- message:", result.choices?.[0]?.message);
      console.error("- finish_reason:", result.choices?.[0]?.finish_reason);
      
      if (result.error) {
        console.error("OpenAI error:", result.error);
        throw new Error(`OpenAI API error: ${result.error.message}`);
      }
      
      throw new Error("OpenAI returned empty response - possibly rate limited or filtered");
    }

    try {
      // Clean the content - remove markdown code blocks if present
      let cleanContent = content.trim();
      
      // Remove ```json and ``` markers
      if (cleanContent.includes('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
      } else if (cleanContent.includes('```')) {
        cleanContent = cleanContent.replace(/```\n?/, '').replace(/```\n?$/, '').trim();
      }
      
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      console.log("Parsed result:", parsed);
      
      // Convert visual characteristics to detection results
      const eyesRed = parsed.eyesRed ?? false;
      const eyesGlassy = parsed.eyesGlassy ?? false;
      const eyesHalfClosed = parsed.eyesHalfClosed ?? false;
      const eyesClosed = parsed.eyesClosed ?? false;
      const faceRed = parsed.faceRed ?? false;
      const lookingAway = parsed.lookingAway ?? false;
      
      // Derive states from visual characteristics
      const isDrunk = (eyesRed || eyesGlassy) && (faceRed || eyesHalfClosed);
      const isSleepy = eyesClosed || eyesHalfClosed;
      const isDistracted = lookingAway;
      
      // Build indicators list
      const indicators: string[] = [];
      if (eyesRed) indicators.push("red eyes");
      if (eyesGlassy) indicators.push("glassy eyes");
      if (eyesHalfClosed) indicators.push("droopy eyelids");
      if (eyesClosed) indicators.push("eyes closed");
      if (faceRed) indicators.push("facial redness");
      if (lookingAway) indicators.push("looking away");
      
      // Determine primary state
      let state: "drunk" | "sleepy" | "distracted" | "normal" = "normal";
      if (isDrunk) state = "drunk";
      else if (isSleepy) state = "sleepy";
      else if (isDistracted) state = "distracted";
      
      const result: DetectionResult = {
        isDrunk,
        isSleepy,
        isDistracted,
        confidence: parsed.confidence ?? 75,
        indicators,
        state
      };
      
      return result;
    } catch (error) {
      console.error("Failed to parse OpenAI response:", error);
      return {
        isDrunk: false,
        isSleepy: false,
        isDistracted: false,
        confidence: 0,
        indicators: ["Analysis failed - unable to determine"],
        state: "normal",
      };
    }
  };

  const analyzeCurrentFrame = async () => {
    if (isAnalyzing || !videoRef.current?.videoWidth) return;

    setIsAnalyzing(true);
    try {
      // Add small random delay to avoid pattern detection
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      
      const base64Image = getBase64FromCanvas();
      if (!base64Image) {
        throw new Error("Failed to capture frame");
      }

      // Try analysis with retry logic
      let result: DetectionResult | null = null;
      let attempts = 0;
      const maxAttempts = 1; // Reduce to single attempt to avoid repeated refusals

      while (!result && attempts < maxAttempts) {
        try {
          attempts++;
          result = await analyzeImageWithOpenAI(base64Image);
          break;
        } catch (error) {
          console.warn(`Analysis attempt ${attempts} failed:`, (error as Error).message);
          if (attempts === maxAttempts) {
            // On final failure, keep previous result if it exists
            console.error("Analysis failed, keeping previous result");
            return;
          }
          // Wait 5 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      if (result) {
        setCurrentResult(result);
        console.log("Analysis result:", result);

        // Check if any impairment detected (confidence threshold: 30%)
        if ((result.isDrunk || result.isSleepy || result.isDistracted) && result.confidence >= 30) {
          // Show browser notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("⚠️ Impairment Detected", {
              body: `${result.state.toUpperCase()}: ${result.indicators.join(", ")}`,
              icon: "/icon-192.png",
              tag: "impairment-alert",
            });
          }

          // Show toast
          toast.error(`⚠️ ${result.state.toUpperCase()} detected!`);

          // Audible + spoken alert (rate limited to once per 60 seconds)
          const now = Date.now();
          if (now - lastAlertTimeRef.current > 60000) {
            lastAlertTimeRef.current = now;
            playAlertSound();
            speakAlert(`Warning. ${result.state} detected. Please pull over and do not drive.`);
          }
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      // Don't show toast for every failure to avoid spam
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Play an audible alert when impairment is detected
  const playAlertSound = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      oscillator.connect(gain).connect(audioCtx.destination);
      oscillator.start();
      // two quick beeps
      gain.gain.exponentialRampToValueAtTime(0.4, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
      oscillator.frequency.setValueAtTime(660, audioCtx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.4, audioCtx.currentTime + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
      oscillator.stop(audioCtx.currentTime + 0.65);
    } catch {}
  };

  const speakAlert = (text: string) => {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onerror = () => {
        // Retry once if it fails (common in PWA)
        setTimeout(() => {
          try {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
          } catch {}
        }, 200);
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      // Fallback: try without canceling
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  };

  const startMonitoring = async () => {
    try {
      setCameraError(null);
      
      // Clear any uploaded video when starting live monitoring
      if (uploadedVideo) {
        clearUploadedVideo();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });
      }

      setIsMonitoring(true);
      setIsVideoMode(false);
      
      // Wait 3 seconds for camera to stabilize before first analysis
      setTimeout(() => {
        analyzeCurrentFrame();
      }, 3000);
      
      // Analyze every 10 seconds (adjust if rate limits occur)
      intervalRef.current = setInterval(() => {
        analyzeCurrentFrame();
      }, 10000);
    } catch (error) {
      setCameraError("Failed to access camera. Please grant camera permissions.");
      toast.error("Camera access denied");
      console.error("Camera error:", error);
    }
  };

  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsMonitoring(false);
    setCurrentResult(null);
  };

  const getAlertStyle = () => {
    if (!currentResult) return "";
    
    if (currentResult.isDrunk && currentResult.confidence >= 30) {
      return "bg-red-500/30 border-red-600 border-4";
    } else if (currentResult.isSleepy && currentResult.confidence >= 30) {
      return "bg-orange-500/30 border-orange-500 border-4";
    } else if (currentResult.isDistracted && currentResult.confidence >= 30) {
      return "bg-yellow-500/30 border-yellow-500 border-4";
    }
    return "";
  };

  const getStateText = () => {
    if (!currentResult) return "";
    
    if (currentResult.isDrunk && currentResult.confidence >= 30) {
      return "⚠️ DRUNK DETECTED";
    } else if (currentResult.isSleepy && currentResult.confidence >= 30) {
      return "⚠️ SLEEPY DETECTED";
    } else if (currentResult.isDistracted && currentResult.confidence >= 30) {
      return "⚠️ DISTRACTED DETECTED";
    }
    return "✅ NORMAL";
  };

  const getStateColor = () => {
    if (!currentResult) return "text-blue-600";
    
    if (currentResult.isDrunk && currentResult.confidence >= 30) {
      return "text-red-600";
    } else if (currentResult.isSleepy && currentResult.confidence >= 30) {
      return "text-orange-600";
    } else if (currentResult.isDistracted && currentResult.confidence >= 30) {
      return "text-yellow-600";
    }
    return "text-green-600";
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Video Upload Button - Fixed in top right corner */}
      <div className="fixed top-20 right-4 z-20 hidden">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-3 sm:p-4 rounded-full shadow-xl transition-all hover:scale-110 border-2 border-white"
          title="Upload Video or Photo for Analysis"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </button>
      </div>

      {/* Camera/Video Section */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-8">
        <div className="flex items-center justify-center mb-6 relative">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 text-center">
            {isVideoMode ? "📹 Video Analysis" : uploadedImage ? "🖼️ Image Analysis" : "🎥 Live Camera Monitor"}
          </h2>
          {(isVideoMode || uploadedImage) && (
            <button
              onClick={clearUploadedVideo}
              className="absolute right-0 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all shadow-md"
            >
              ✕ Clear Media
            </button>
          )}
        </div>
        
        <div className="space-y-4 sm:space-y-6">
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 p-4">
            {uploadedImage && !isVideoMode ? (
              <img
                src={uploadedImage}
                alt="Uploaded"
                className={`w-full max-w-3xl mx-auto block rounded-xl ${`border-4 ${getAlertStyle() || 'border-blue-500'} shadow-2xl`} transition-all duration-300 ease-in-out`}
                style={{ minHeight: '260px', objectFit: 'contain', backgroundColor: '#f1f5f9' }}
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay={!isVideoMode}
                playsInline
                muted={!isVideoMode}
                controls={isVideoMode}
                src={uploadedVideo || undefined}
                className={`w-full max-w-3xl mx-auto block rounded-xl ${
                  isMonitoring || isVideoMode 
                    ? `border-4 ${getAlertStyle() || 'border-blue-500'} shadow-2xl` 
                    : 'border-4 border-slate-300'
                } transition-all duration-300 ease-in-out`}
                style={{ minHeight: '260px', backgroundColor: '#f1f5f9' }}
              />
            )}
            <canvas ref={canvasRef} className="hidden" />

            {/* Speed HUD */}
            <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto">
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-md border-2 bg-white/90 backdrop-blur-sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-slate-600 text-xs">Speed</span>
                  <span className="text-2xl font-bold text-slate-800">
                    {currentSpeedMph != null ? Math.round(currentSpeedMph) : '--'}
                  </span>
                  <span className="text-slate-500 text-xs">mph</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-slate-600 text-xs">Limit</span>
                  <span className={`text-2xl font-bold ${speedLimitMph != null && currentSpeedMph != null && currentSpeedMph > speedLimitMph ? 'text-red-600' : 'text-green-600'}`}>
                    {speedLimitMph != null ? speedLimitMph : '--'}
                  </span>
                  <span className="text-slate-500 text-xs">mph</span>
                </div>
                <div className="text-xs font-semibold px-2 py-1 rounded-md border"
                  style={{
                    borderColor: (speedLimitMph != null && currentSpeedMph != null && currentSpeedMph > speedLimitMph) ? '#dc2626' : '#16a34a',
                    color: (speedLimitMph != null && currentSpeedMph != null && currentSpeedMph > speedLimitMph) ? '#dc2626' : '#16a34a',
                    background: 'white'
                  }}
                >
                  {speedLimitMph != null && currentSpeedMph != null
                    ? (currentSpeedMph > speedLimitMph ? 'Over' : 'Under')
                    : '—'}
                </div>
              </div>
            </div>
            
            {currentResult && (
              <div className="absolute top-3 sm:top-6 left-2 right-2 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 bg-white/95 backdrop-blur-sm px-3 py-2 sm:px-6 sm:py-4 rounded-xl shadow-xl border-2 border-white">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                  <span className={`text-sm sm:text-base md:text-xl font-bold ${getStateColor()}`}>
                    {getStateText()}
                  </span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-slate-700 font-semibold text-xs sm:text-sm">
                      {currentResult.confidence}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-red-700 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">⚠️</span>
                <span className="font-semibold">Camera Error</span>
              </div>
              <p className="text-sm">{cameraError}</p>
            </div>
          )}
            
          <div className="flex justify-center gap-3 sm:gap-6 flex-wrap">
            {!isVideoMode && !isMonitoring && (
              <button
                onClick={startMonitoring}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="flex items-center gap-3">
                  <span className="text-xl">📹</span>
                  Start Live Monitoring
                </span>
              </button>
            )}
            
            {!isVideoMode && isMonitoring && (
              <button
                onClick={stopMonitoring}
                disabled={isAnalyzing}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="flex items-center gap-3">
                  <span className="text-xl">🛑</span>
                  Stop Monitoring
                </span>
              </button>
            )}
            
            {isVideoMode && uploadedVideo && (
              <button
                onClick={analyzeUploadedVideo}
                disabled={isAnalyzing}
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="flex items-center gap-3">
                  <span className="text-xl">🔍</span>
                  Analyze Video
                </span>
              </button>
            )}
            {!isVideoMode && uploadedImage && (
              <button
                onClick={analyzeUploadedImage}
                disabled={isAnalyzing}
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="flex items-center gap-3">
                  <span className="text-xl">🔍</span>
                  Analyze Image
                </span>
              </button>
            )}
          </div>

          {isAnalyzing && (
            <div className="text-center bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
              <div className="inline-flex items-center gap-3 text-blue-700">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="font-semibold text-base sm:text-lg">
                  {isVideoMode ? "🎬 Analyzing video..." : "🔍 Analyzing live feed..."}
                </span>
              </div>
            </div>
          )}
          {!isVideoMode && (
            <p className="text-center text-slate-500 text-xs sm:text-sm">
              Keep your eyes on the road. You do not need to look at the camera.
            </p>
          )}
        </div>
      </div>

      {/* Results Section */}
      {currentResult && (
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-xl border border-slate-200 p-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center flex items-center justify-center gap-3">
            <span className="text-4xl">📊</span>
            Analysis Results
          </h2>
          
          <div className="space-y-6">
            <div className="p-8 bg-white rounded-2xl border-2 border-slate-200 shadow-lg">
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                  <div className={`text-3xl font-bold mb-3 ${
                    currentResult.isDrunk ? "text-red-600" : "text-slate-400"
                  }`}>
                    {currentResult.isDrunk ? "🍺 Intoxicated" : "✅ Sober"}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">Alcohol Detection</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                  <div className={`text-3xl font-bold mb-3 ${
                    currentResult.isSleepy ? "text-orange-600" : "text-slate-400"
                  }`}>
                    {currentResult.isSleepy ? "😴 Sleepy" : "✅ Alert"}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">Drowsiness Detection</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                  <div className={`text-3xl font-bold mb-3 ${
                    currentResult.isDistracted ? "text-yellow-600" : "text-slate-400"
                  }`}>
                    {currentResult.isDistracted ? "📱 Distracted" : "✅ Focused"}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">Attention Detection</div>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="font-bold text-slate-700 mb-4 text-lg flex items-center gap-2">
                  <span className="text-xl">🎯</span>
                  Confidence Score
                </p>
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl font-bold text-blue-600">{currentResult.confidence}%</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 font-medium">Accuracy</span>
                      <div className="w-40 bg-slate-300 rounded-full h-3 shadow-inner">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                          style={{ width: `${currentResult.confidence}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                
              {currentResult.indicators.length > 0 && (
                <div>
                  <p className="font-bold text-slate-700 mb-4 text-lg flex items-center gap-2">
                    <span className="text-xl">🔍</span>
                    Indicators Detected
                  </p>
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                    <ul className="space-y-3">
                      {currentResult.indicators.map((indicator, index) => (
                        <li key={index} className="text-slate-700 flex items-center gap-3 p-2 bg-white rounded-lg shadow-sm">
                          <span className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex-shrink-0"></span>
                          <span className="font-medium capitalize">{indicator}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {((currentResult.isDrunk || currentResult.isSleepy || currentResult.isDistracted) && currentResult.confidence >= 30) && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-xl p-6 shadow-lg">
                <h4 className="font-bold text-red-800 mb-3 text-xl flex items-center gap-3">
                  <span className="text-2xl animate-pulse">⚠️</span>
                  Safety Warning
                </h4>
                <p className="text-red-700 leading-relaxed">
                  Signs of impairment have been detected. Please do not operate a vehicle.
                  Use alternative transportation like rideshare services or public transit.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
