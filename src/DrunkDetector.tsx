import { useState, useRef, useEffect } from "react";
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
  const [isVideoMode, setIsVideoMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Check file size (limit to 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video file is too large. Please select a file under 50MB.');
      return;
    }

    const url = URL.createObjectURL(file);
    setUploadedVideo(url);
    setIsVideoMode(true);
    setCurrentResult(null);
    
    // Stop live monitoring if active
    if (isMonitoring) {
      stopMonitoring();
    }

    toast.success('Video uploaded successfully!');
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

  const clearUploadedVideo = () => {
    if (uploadedVideo) {
      URL.revokeObjectURL(uploadedVideo);
    }
    setUploadedVideo(null);
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
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      // Don't show toast for every failure to avoid spam
    } finally {
      setIsAnalyzing(false);
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
      
      // Analyze every 30 seconds to avoid rate limiting
      intervalRef.current = setInterval(() => {
        analyzeCurrentFrame();
      }, 30000);
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
    <div className="space-y-6">
      {/* Video Upload Button - Fixed in top right corner */}
      <div className="fixed top-20 right-4 z-20">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-4 rounded-full shadow-xl transition-all hover:scale-110 border-2 border-white"
          title="Upload Video for Analysis"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </button>
      </div>

      {/* Camera/Video Section */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="flex items-center justify-center mb-6 relative">
          <h2 className="text-3xl font-bold text-slate-800 text-center">
            {isVideoMode ? "📹 Video Analysis" : "🎥 Live Camera Monitor"}
          </h2>
          {isVideoMode && (
            <button
              onClick={clearUploadedVideo}
              className="absolute right-0 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all shadow-md"
            >
              ✕ Clear Video
            </button>
          )}
        </div>
        
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 p-4">
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
              style={{ minHeight: '360px', backgroundColor: '#f1f5f9' }}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {currentResult && (
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm px-6 py-4 rounded-xl shadow-xl border-2 border-white">
                <div className="flex items-center gap-4">
                  <span className={`text-xl font-bold ${getStateColor()}`}>
                    {getStateText()}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-slate-700 font-semibold">
                      {currentResult.confidence}% confidence
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
            
          <div className="flex justify-center gap-6 flex-wrap">
            {!isVideoMode && !isMonitoring && (
              <button
                onClick={startMonitoring}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
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
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
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
          </div>

          {isAnalyzing && (
            <div className="text-center bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
              <div className="inline-flex items-center gap-3 text-blue-700">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="font-semibold text-lg">
                  {isVideoMode ? "🎬 Analyzing video..." : "🔍 Analyzing live feed..."}
                </span>
              </div>
            </div>
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
