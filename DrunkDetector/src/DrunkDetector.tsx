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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
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
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this person's facial features and eye characteristics. Return ONLY a JSON object:
{
  "eyesRed": true or false,
  "eyesGlassy": true or false,
  "eyesHalfClosed": true or false,
  "eyesClosed": true or false,
  "faceRed": true or false,
  "lookingAway": true or false,
  "confidence": number 0-100
}

Look for these visual characteristics:
- eyesRed: Are the eyes visibly red or bloodshot?
- eyesGlassy: Do the eyes appear watery, glassy, or unfocused?
- eyesHalfClosed: Are the eyelids drooping or eyes partially closed?
- eyesClosed: Are the eyes fully closed?
- faceRed: Is there facial redness or flushing?
- lookingAway: Are they looking away from the camera?
- confidence: How certain are you of these observations (0-100)?

Return ONLY the JSON object with these exact field names.`,
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
    
    const content = result.choices?.[0]?.message?.content;
    
    console.log("OpenAI message content:", content);
    
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
      const base64Image = getBase64FromCanvas();
      if (!base64Image) {
        throw new Error("Failed to capture frame");
      }

      // Try analysis with retry logic
      let result: DetectionResult | null = null;
      let attempts = 0;
      const maxAttempts = 2;

      while (!result && attempts < maxAttempts) {
        try {
          attempts++;
          result = await analyzeImageWithOpenAI(base64Image);
          break;
        } catch (error) {
          console.warn(`Analysis attempt ${attempts} failed:`, (error as Error).message);
          if (attempts === maxAttempts) {
            // On final failure, keep previous result if it exists
            console.error("All analysis attempts failed, keeping previous result");
            return;
          }
          // Wait 2 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
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
      analyzeCurrentFrame(); // Initial analysis
      
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
      {/* Camera Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">
          Live Camera Monitor
        </h2>
        
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full max-w-2xl mx-auto ${getAlertStyle()} transition-all`}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {currentResult && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 px-6 py-3 rounded-lg shadow-lg">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${getStateColor()}`}>
                    {getStateText()}
                  </span>
                  <span className="text-slate-600 font-medium">
                    {currentResult.confidence}% confidence
                  </span>
                </div>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {cameraError}
              </div>
            )}
            
          <div className="flex justify-center gap-4">
            {!isMonitoring ? (
              <button
                onClick={startMonitoring}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow"
              >
                📹 Start Monitoring
              </button>
            ) : (
            <button
                onClick={stopMonitoring}
                disabled={isAnalyzing}
                className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow"
            >
                🛑 Stop Monitoring
            </button>
            )}
          </div>

          {isAnalyzing && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                Analyzing...
              </div>
            </div>
            )}
        </div>
      </div>

      {/* Results Section */}
      {currentResult && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">
            Current Status
          </h2>
          
          <div className="space-y-4">
            <div className="p-6 bg-slate-50 rounded-lg border-2 border-slate-200">
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${
                    currentResult.isDrunk ? "text-red-600" : "text-slate-400"
                  }`}>
                    {currentResult.isDrunk ? "🍺 Intoxicated" : "✓ Sober"}
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${
                    currentResult.isSleepy ? "text-orange-600" : "text-slate-400"
                  }`}>
                    {currentResult.isSleepy ? "😴 Sleepy" : "✓ Alert"}
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${
                    currentResult.isDistracted ? "text-yellow-600" : "text-slate-400"
                  }`}>
                    {currentResult.isDistracted ? "📱 Distracted" : "✓ Focused"}
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="font-semibold text-slate-700 mb-2">Confidence Score</p>
                <div className="bg-white rounded-lg p-3">
                    <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">{currentResult.confidence}%</span>
                    <div className="w-32 bg-slate-200 rounded-full h-2">
                        <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${currentResult.confidence}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
              {currentResult.indicators.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700 mb-2">Indicators Detected</p>
                  <div className="bg-white rounded-lg p-3">
                      <ul className="space-y-1">
                      {currentResult.indicators.map((indicator, index) => (
                        <li key={index} className="text-sm text-slate-600 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                            {indicator}
                          </li>
                        ))}
                      </ul>
                  </div>
                </div>
              )}
            </div>

            {((currentResult.isDrunk || currentResult.isSleepy || currentResult.isDistracted) && currentResult.confidence >= 30) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-bold text-red-800 mb-2">⚠️ Safety Warning</h4>
                <p className="text-red-700 text-sm">
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
