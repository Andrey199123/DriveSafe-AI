import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { haversineDistanceMeters, mpsToMph, parseMaxspeedToMph } from "./lib/utils";
import { toast } from "sonner";
import { api } from "../convex/_generated/api";

interface DetectionResult {
  isDrunk: boolean;
  isSleepy: boolean;
  isDistracted: boolean;
  confidence: number;
  indicators: string[];
  state: "drunk" | "sleepy" | "distracted" | "normal";
}

type AnalysisSource = "live_camera" | "uploaded_image" | "uploaded_video";
type AlertTone = "speed" | "impairment";

interface GeoSample {
  lat: number;
  lon: number;
  t: number;
  accuracy: number;
}

const GEO_FALLBACK_INTERVAL_MS = 4000;
const GEO_FALLBACK_STALE_MS = 3500;
const MIN_COMPUTED_SPEED_INTERVAL_MS = 3000;
const MIN_DISTANCE_FOR_SPEED_ESTIMATE_METERS = 20;
const SPEED_SMOOTHING_WINDOW = 4;
const STATIONARY_SPEED_THRESHOLD_MPH = 3;
const OVERSPEED_BUFFER_MPH = 3;
const OVERSPEED_CONFIRMATION_SAMPLES = 3;
const PREFERRED_ALERT_VOICE_NAMES = [
  "samantha",
  "ava",
  "allison",
  "susan",
  "karen",
  "victoria",
  "alex",
  "daniel",
  "fred",
  "tom",
];

const DISTRACTION_THRESHOLD = 3; // Number of detections before voice alert
const DISTRACTION_COOLDOWN_MS = 5000; // 5 seconds between distraction counts

function scoreAlertVoice(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;

  // Strongly prefer local voices for better quality
  if (voice.localService) score += 10;
  
  // Prefer US English, then any English
  if (lang.startsWith("en-us")) score += 8;
  else if (lang.startsWith("en-gb")) score += 6;
  else if (lang.startsWith("en")) score += 4;

  // Prefer specific high-quality voices
  PREFERRED_ALERT_VOICE_NAMES.forEach((preferredName, index) => {
    if (name.includes(preferredName)) {
      score += (PREFERRED_ALERT_VOICE_NAMES.length - index) * 2;
    }
  });

  // Avoid low-quality voices
  if (name.includes("compact")) score -= 5;
  if (name.includes("novelty")) score -= 10;
  if (name.includes("enhanced")) score += 3;
  if (name.includes("premium")) score += 3;

  return score;
}

export function DrunkDetector() {
  const analyzeFrame = useAction(api.ai.analyzeFrame);
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
  const overSpeedSampleCountRef = useRef<number>(0);
  const distractionCountRef = useRef<number>(0);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const geoWatchIdRef = useRef<number | null>(null);
  const lastGeoSampleRef = useRef<GeoSample | null>(null);
  const lastGeoUpdateAtRef = useRef<number>(0);
  const lastLimitFetchRef = useRef<number>(0);
  const speedSamplesRef = useRef<number[]>([]);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const [currentSpeedMph, setCurrentSpeedMph] = useState<number | null>(null);
  const [speedLimitMph, setSpeedLimitMph] = useState<number | null>(null);
  const geoPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const speech = window.speechSynthesis;

    const selectPreferredVoice = () => {
      const voices = speech.getVoices();
      if (!voices.length) return;
      preferredVoiceRef.current = [...voices].sort(
        (a, b) => scoreAlertVoice(b) - scoreAlertVoice(a),
      )[0] ?? null;
    };

    selectPreferredVoice();
    speech.addEventListener("voiceschanged", selectPreferredVoice);

    return () => {
      speech.removeEventListener("voiceschanged", selectPreferredVoice);
    };
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

    const updateSmoothedSpeed = (nextSpeedMph: number) => {
      const boundedSpeed = Math.max(0, nextSpeedMph);
      speedSamplesRef.current.push(boundedSpeed);
      if (speedSamplesRef.current.length > SPEED_SMOOTHING_WINDOW) {
        speedSamplesRef.current.shift();
      }

      const averageSpeed =
        speedSamplesRef.current.reduce((sum, value) => sum + value, 0) /
        speedSamplesRef.current.length;
      const roundedSpeed = Math.round(averageSpeed * 10) / 10;
      setCurrentSpeedMph(roundedSpeed < STATIONARY_SPEED_THRESHOLD_MPH ? 0 : roundedSpeed);
    };

    const handlePosition = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lon, speed } = pos.coords;
      const accuracy = Math.max(pos.coords.accuracy ?? 0, 0);
      const timestamp = pos.timestamp;
      const previousSample = lastGeoSampleRef.current;
      const nativeSpeedMph =
        typeof speed === "number" && !Number.isNaN(speed) && speed >= 0
          ? mpsToMph(speed)
          : null;
      let computedSpeedMph = 0;

      lastGeoUpdateAtRef.current = Date.now();

      if (previousSample) {
        const dtMs = timestamp - previousSample.t;
        if (dtMs >= MIN_COMPUTED_SPEED_INTERVAL_MS) {
          const distanceMeters = haversineDistanceMeters(
            previousSample.lat,
            previousSample.lon,
            lat,
            lon,
          );
          const jitterBufferMeters = Math.max(
            MIN_DISTANCE_FOR_SPEED_ESTIMATE_METERS,
            accuracy + previousSample.accuracy,
          );
          const adjustedDistanceMeters = Math.max(0, distanceMeters - jitterBufferMeters);

          if (adjustedDistanceMeters > 0) {
            computedSpeedMph = mpsToMph(adjustedDistanceMeters / (dtMs / 1000));
          }
        }
      }

      if (nativeSpeedMph !== null && computedSpeedMph === 0 && nativeSpeedMph < 8) {
        updateSmoothedSpeed(0);
      } else if (nativeSpeedMph !== null && computedSpeedMph > 0) {
        updateSmoothedSpeed((nativeSpeedMph * 0.65) + (computedSpeedMph * 0.35));
      } else if (nativeSpeedMph !== null) {
        updateSmoothedSpeed(nativeSpeedMph);
      } else {
        updateSmoothedSpeed(computedSpeedMph);
      }
      lastGeoSampleRef.current = { lat, lon, t: timestamp, accuracy };

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
      if (Date.now() - lastGeoUpdateAtRef.current < GEO_FALLBACK_STALE_MS) {
        return;
      }
      navigator.geolocation.getCurrentPosition(
        handlePosition,
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }, GEO_FALLBACK_INTERVAL_MS);

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
      let bestLimit: { mph: number; distanceMeters: number } | null = null;
      for (const el of elements) {
        const raw = el?.tags?.maxspeed as string | undefined;
        if (!raw) continue;
        const mph = parseMaxspeedToMph(raw);
        if (mph) {
          const centerLat = typeof el?.center?.lat === "number" ? el.center.lat : lat;
          const centerLon = typeof el?.center?.lon === "number" ? el.center.lon : lon;
          const distanceMeters = haversineDistanceMeters(lat, lon, centerLat, centerLon);
          if (!bestLimit || distanceMeters < bestLimit.distanceMeters) {
            bestLimit = { mph, distanceMeters };
          }
        }
      }
      if (bestLimit) setSpeedLimitMph(Math.round(bestLimit.mph));
    } catch {}
  };

  // Overspeed alerts
  useEffect(() => {
    if (currentSpeedMph == null || speedLimitMph == null) return;
    if (currentSpeedMph <= speedLimitMph + OVERSPEED_BUFFER_MPH) {
      overSpeedSampleCountRef.current = 0;
      return;
    }

    overSpeedSampleCountRef.current += 1;
    if (overSpeedSampleCountRef.current < OVERSPEED_CONFIRMATION_SAMPLES) {
      return;
    }

    const now = Date.now();
    if (now - lastSpeedAlertTimeRef.current > 60000) {
      lastSpeedAlertTimeRef.current = now;
      overSpeedSampleCountRef.current = 0;
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Speed Limit Exceeded", {
            body: `Speed ${Math.round(currentSpeedMph)}mph > Limit ${speedLimitMph}mph. Slow down.`,
            icon: "/icon-192.png",
            tag: "overspeed-alert",
          });
        }
      } catch {}
      toast.error("Speed limit exceeded. Slow down.");
      playAlertSound();
      speakAlert("Slow down. You're over the speed limit.", "speed");
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

      const result = await analyzeImageWithVision(base64Image, "uploaded_video");
      setCurrentResult(result);
      
      if ((result.isDrunk || result.isSleepy || result.isDistracted) && result.confidence >= 30) {
        toast.error(`${result.state.toUpperCase()} detected in video.`);
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
      const result = await analyzeImageWithVision(base64Image, "uploaded_image");
      setCurrentResult(result);

      if ((result.isDrunk || result.isSleepy || result.isDistracted) && result.confidence >= 30) {
        toast.error(`${result.state.toUpperCase()} detected in image.`);
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

  const analyzeImageWithVision = async (
    base64Image: string,
    source: AnalysisSource,
  ): Promise<DetectionResult> => {
    return analyzeFrame({ base64Image, source });
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
          result = await analyzeImageWithVision(base64Image, "live_camera");
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
          const now = Date.now();
          
          // Handle distraction with graduated response
          if (result.isDistracted && !result.isDrunk && !result.isSleepy) {
            // Only increment if enough time has passed since last detection
            if (now - lastAlertTimeRef.current > DISTRACTION_COOLDOWN_MS) {
              distractionCountRef.current += 1;
              lastAlertTimeRef.current = now;
              
              if (distractionCountRef.current < DISTRACTION_THRESHOLD) {
                // First 2 detections: subtle alert only
                vibrateDevice();
                playSubtleAlert();
                toast.warning(`Attention reminder (${distractionCountRef.current}/${DISTRACTION_THRESHOLD})`);
              } else {
                // 3rd+ detection: full alert with voice
                vibrateDevice();
                playAlertSound();
                toast.error(`DISTRACTED detected - multiple instances.`);
                speakAlert("Warning. Distraction detected multiple times. Please pull over and do not drive.", "impairment");
                
                // Show browser notification
                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification("Attention Warning", {
                    body: `Multiple distraction instances detected: ${result.indicators.join(", ")}`,
                    icon: "/icon-192.png",
                    tag: "impairment-alert",
                  });
                }
              }
            }
          } else {
            // Drunk or sleepy: immediate full alert (rate limited to once per 60 seconds)
            if (now - lastAlertTimeRef.current > 60000) {
              lastAlertTimeRef.current = now;
              
              // Show browser notification
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Attention Warning", {
                  body: `${result.state.toUpperCase()}: ${result.indicators.join(", ")}`,
                  icon: "/icon-192.png",
                  tag: "impairment-alert",
                });
              }

              // Show toast
              toast.error(`${result.state.toUpperCase()} detected.`);

              // Audible + spoken alert
              playAlertSound();
              speakAlert(`Warning. ${result.state} detected. Please pull over and do not drive.`, "impairment");
            }
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

  // Play a subtle attention sound for minor alerts
  const playSubtleAlert = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      oscillator.connect(gain).connect(audioCtx.destination);
      oscillator.start();
      // single gentle beep
      gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
      oscillator.stop(audioCtx.currentTime + 0.25);
    } catch {}
  };

  // Vibrate device if supported
  const vibrateDevice = () => {
    try {
      if ('vibrate' in navigator) {
        // Pattern: vibrate 200ms, pause 100ms, vibrate 200ms
        navigator.vibrate([200, 100, 200]);
      }
    } catch {}
  };

  const speakAlert = (text: string, tone: AlertTone = "impairment") => {
    try {
      if (!('speechSynthesis' in window)) return;
      const speech = window.speechSynthesis;
      speech.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const preferredVoice = preferredVoiceRef.current;
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = "en-US";
      }
      // Improved voice settings for more natural speech
      utterance.rate = tone === "speed" ? 0.95 : 1.0;
      utterance.pitch = tone === "speed" ? 1.0 : 1.0;
      utterance.volume = 0.9;
      utterance.onerror = () => {
        // Retry once if it fails (common in PWA)
        setTimeout(() => {
          try {
            const retryUtterance = new SpeechSynthesisUtterance(text);
            if (preferredVoice) {
              retryUtterance.voice = preferredVoice;
              retryUtterance.lang = preferredVoice.lang;
            } else {
              retryUtterance.lang = "en-US";
            }
            retryUtterance.rate = utterance.rate;
            retryUtterance.pitch = utterance.pitch;
            retryUtterance.volume = utterance.volume;
            speech.speak(retryUtterance);
          } catch {}
        }, 200);
      };
      speech.speak(utterance);
    } catch {
      // Fallback: try without canceling
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        const preferredVoice = preferredVoiceRef.current;
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          utterance.lang = preferredVoice.lang;
        } else {
          utterance.lang = "en-US";
        }
        utterance.rate = tone === "speed" ? 0.95 : 1.0;
        utterance.pitch = tone === "speed" ? 1.0 : 1.0;
        utterance.volume = 0.9;
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
      
      // Reset distraction counter for new session
      distractionCountRef.current = 0;
      sessionStartTimeRef.current = Date.now();
      
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
    
    // Reset distraction counter when stopping
    distractionCountRef.current = 0;
  };

  const getAlertStyle = () => {
    if (!currentResult) return "";
    
    if (currentResult.isDrunk && currentResult.confidence >= 30) {
      return "border-red-600";
    } else if (currentResult.isSleepy && currentResult.confidence >= 30) {
      return "border-amber-500";
    } else if (currentResult.isDistracted && currentResult.confidence >= 30) {
      return "border-yellow-500";
    }
    return "border-[#1a7457]";
  };

  const getStateText = () => {
    if (!currentResult) return "";
    
    if (currentResult.isDrunk && currentResult.confidence >= 30) {
      return "Possible impairment";
    } else if (currentResult.isSleepy && currentResult.confidence >= 30) {
      return "Possible drowsiness";
    } else if (currentResult.isDistracted && currentResult.confidence >= 30) {
      return "Possible distraction";
    }
    return "Normal";
  };

  const getStateColor = () => {
    if (!currentResult) return "text-[#1a7457]";
    
    if (currentResult.isDrunk && currentResult.confidence >= 30) {
      return "text-red-600";
    } else if (currentResult.isSleepy && currentResult.confidence >= 30) {
      return "text-amber-600";
    } else if (currentResult.isDistracted && currentResult.confidence >= 30) {
      return "text-yellow-600";
    }
    return "text-[#1a7457]";
  };

  const modeLabel = isVideoMode
    ? "Video review"
    : uploadedImage
      ? "Image review"
      : "Live monitoring";
  const statusLabel = currentResult
    ? getStateText()
    : isMonitoring
      ? "Monitoring active"
      : uploadedVideo || uploadedImage
        ? "Media loaded"
        : "Waiting to begin";
  const statusTextColor = currentResult ? getStateColor() : "text-[#1a7457]";
  const isOverSpeed =
    currentSpeedMph != null && speedLimitMph != null && currentSpeedMph > speedLimitMph;
  const detailCards = [
    {
      label: "Mode",
      value: modeLabel,
      note: isMonitoring ? "Frames analyzed every 10 seconds" : "Manual start",
    },
    {
      label: "Speed",
      value: currentSpeedMph != null ? `${Math.round(currentSpeedMph)} mph` : "--",
      note: isOverSpeed ? "Above road limit" : "Within road limit",
    },
  ];
  const resultCards = [
    {
      label: "Alcohol cues",
      value: currentResult?.isDrunk ? "Detected" : "Clear",
      active: currentResult?.isDrunk ?? false,
      activeClass: "text-red-600",
    },
    {
      label: "Drowsiness",
      value: currentResult?.isSleepy ? "Detected" : "Clear",
      active: currentResult?.isSleepy ?? false,
      activeClass: "text-amber-600",
    },
    {
      label: "Attention",
      value: currentResult?.isDistracted ? "Reduced" : "Focused",
      active: currentResult?.isDistracted ?? false,
      activeClass: "text-yellow-600",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-[#e8e5de] bg-white shadow-[0_16px_64px_rgba(17,24,39,0.06)]">
        <div className="border-b border-[#e8e5de] px-5 py-6 sm:px-8 sm:py-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center rounded-full bg-[#f0fdf4] px-4 py-1.5 text-sm font-semibold text-[#1a7457]">
                Driver safety workspace
              </span>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#111827] sm:text-5xl">
                {modeLabel}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
                A calmer monitoring surface for live camera review, uploaded media checks, and speed-limit awareness.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center rounded-full border border-[#e8e5de] bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-[#1a7457] hover:text-[#1a7457] focus:outline-none focus:ring-2 focus:ring-[#1a7457] focus:ring-offset-2"
              >
                Upload media
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {detailCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[22px] border border-[#e8e5de] bg-[#faf9f5] p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#111827]">
                  {card.value}
                </p>
                <p className="mt-2 text-sm text-slate-500">{card.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
          <div className="space-y-5">
            <div className="relative rounded-[28px] border border-[#e8e5de] bg-[#f6f4ee] p-4 sm:p-5">
              {uploadedImage && !isVideoMode ? (
                <img
                  src={uploadedImage}
                  alt="Uploaded media"
                  className={`block w-full rounded-[24px] border-2 ${getAlertStyle()} bg-white shadow-[0_16px_48px_rgba(17,24,39,0.08)]`}
                  style={{ minHeight: "320px", objectFit: "contain" }}
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay={!isVideoMode}
                  playsInline
                  muted={!isVideoMode}
                  controls={isVideoMode}
                  src={uploadedVideo || undefined}
                  className={`block w-full rounded-[24px] border-2 ${
                    isMonitoring || isVideoMode ? getAlertStyle() : "border-[#d9d3c7]"
                  } bg-white shadow-[0_16px_48px_rgba(17,24,39,0.08)]`}
                  style={{ minHeight: "320px" }}
                />
              )}
              <canvas ref={canvasRef} className="hidden" />

              <div className="absolute left-4 right-4 top-4 flex flex-wrap items-center justify-between gap-3">
                <div className="rounded-full border border-[#e8e5de] bg-white/95 px-4 py-2 shadow-sm backdrop-blur">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold uppercase tracking-[0.24em] ${statusTextColor}`}>
                      {statusLabel}
                    </span>
                    {currentResult && (
                      <span className="text-sm font-medium text-slate-500">
                        {currentResult.confidence}% confidence
                      </span>
                    )}
                  </div>
                </div>
                {(isVideoMode || uploadedImage) && (
                  <button
                    type="button"
                    onClick={clearUploadedVideo}
                    className="rounded-full border border-[#e8e5de] bg-white/95 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur transition hover:border-[#1a7457] hover:text-[#1a7457] focus:outline-none focus:ring-2 focus:ring-[#1a7457] focus:ring-offset-2"
                  >
                    Clear media
                  </button>
                )}
              </div>

              <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:w-auto">
                <div className="flex min-w-[250px] items-center justify-between gap-6 rounded-[20px] border border-[#e8e5de] bg-white/95 px-5 py-4 shadow-sm backdrop-blur">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Speed
                    </p>
                    <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#111827]">
                      {currentSpeedMph != null ? Math.round(currentSpeedMph) : "--"}
                      <span className="ml-2 text-sm font-semibold tracking-[0.16em] text-slate-400">
                        mph
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Road limit
                    </p>
                    <p className={`mt-2 text-3xl font-black tracking-[-0.04em] ${
                      isOverSpeed ? "text-red-600" : "text-[#1a7457]"
                    }`}>
                      {speedLimitMph != null ? speedLimitMph : "--"}
                      <span className="ml-2 text-sm font-semibold tracking-[0.16em] text-slate-400">
                        mph
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {cameraError && (
              <div className="rounded-[22px] border border-red-200 bg-red-50 px-5 py-4 text-red-700">
                <p className="text-sm font-semibold uppercase tracking-[0.24em]">Camera access</p>
                <p className="mt-2 text-sm">{cameraError}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!isVideoMode && !isMonitoring && (
                <button
                  onClick={startMonitoring}
                  className="inline-flex items-center justify-center rounded-full bg-[#111827] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1a7457] focus:ring-offset-2"
                >
                  Start monitoring
                </button>
              )}

              {!isVideoMode && isMonitoring && (
                <button
                  onClick={stopMonitoring}
                  disabled={isAnalyzing}
                  className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Stop monitoring
                </button>
              )}

              {isVideoMode && uploadedVideo && (
                <button
                  onClick={analyzeUploadedVideo}
                  disabled={isAnalyzing}
                  className="inline-flex items-center justify-center rounded-full bg-[#111827] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#1a7457] focus:ring-offset-2"
                >
                  Analyze video
                </button>
              )}

              {!isVideoMode && uploadedImage && (
                <button
                  onClick={analyzeUploadedImage}
                  disabled={isAnalyzing}
                  className="inline-flex items-center justify-center rounded-full bg-[#111827] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#1a7457] focus:ring-offset-2"
                >
                  Analyze image
                </button>
              )}
            </div>

            {isAnalyzing && (
              <div className="rounded-[22px] border border-[#e8e5de] bg-[#faf9f5] px-5 py-4">
                <div className="inline-flex items-center gap-3 text-slate-600">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#1a7457]"></div>
                  <span className="text-sm font-semibold uppercase tracking-[0.18em]">
                    {isVideoMode ? "Analyzing video" : "Analyzing live feed"}
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-[22px] border border-[#e8e5de] bg-[#faf9f5] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1a7457]">
                Driver notes
              </p>
              {!isVideoMode && (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Keep your eyes on the road. The monitor is built to watch passively while you drive.
                </p>
              )}
              <p className="mt-3 text-sm leading-6 text-slate-500">
                This tool provides heuristic safety alerts and is not a sobriety, medical, or law-enforcement assessment.
              </p>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[24px] border border-[#e8e5de] bg-[#faf9f5] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1a7457]">
                Current assessment
              </p>
              <p className={`mt-4 text-3xl font-black tracking-[-0.04em] ${statusTextColor}`}>
                {statusLabel}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {currentResult
                  ? `The latest review returned ${currentResult.confidence}% confidence.`
                  : "Start a live session or upload media to generate the first assessment."}
              </p>
            </div>

            <div className="rounded-[24px] border border-[#e8e5de] bg-white p-6 shadow-[0_16px_40px_rgba(17,24,39,0.04)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Snapshot
              </p>
              <div className="mt-4 space-y-3">
                {resultCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-[18px] border border-[#e8e5de] bg-[#faf9f5] px-4 py-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {card.label}
                    </p>
                    <p className={`mt-2 text-xl font-bold ${card.active ? card.activeClass : "text-slate-400"}`}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {currentResult && (
        <section className="rounded-[28px] border border-[#e8e5de] bg-white p-5 shadow-[0_16px_64px_rgba(17,24,39,0.06)] sm:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1a7457]">
              Latest analysis
            </p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#111827] sm:text-4xl">
              Detailed frame review
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              The latest inference is broken down below so you can see what triggered the alert level.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {resultCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[22px] border border-[#e8e5de] bg-[#faf9f5] p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {card.label}
                </p>
                <p className={`mt-3 text-2xl font-black tracking-[-0.04em] ${card.active ? card.activeClass : "text-slate-400"}`}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-[#e8e5de] bg-[#faf9f5] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Confidence
                </p>
                <p className="mt-2 text-4xl font-black tracking-[-0.05em] text-[#111827]">
                  {currentResult.confidence}%
                </p>
              </div>
              <div className="w-full sm:max-w-sm">
                <div className="h-3 overflow-hidden rounded-full bg-[#e8e5de]">
                  <div
                    className="h-3 rounded-full bg-[#1a7457] transition-all duration-500"
                    style={{ width: `${currentResult.confidence}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {currentResult.indicators.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Indicators
                </p>
                <ul className="mt-4 space-y-3">
                  {currentResult.indicators.map((indicator, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-3 rounded-[18px] border border-[#e8e5de] bg-white px-4 py-3 text-sm font-medium text-slate-700"
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-[#1a7457]"></span>
                      <span className="capitalize">{indicator}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {((currentResult.isDrunk || currentResult.isSleepy || currentResult.isDistracted) && currentResult.confidence >= 30) && (
            <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
                Safety warning
              </p>
              <p className="mt-3 text-sm leading-6 text-red-700">
                Possible impairment-related signs were detected. Do not operate a vehicle. Use alternative transportation such as rideshare or public transit.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
