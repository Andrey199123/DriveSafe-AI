import { useState, useRef } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function DrunkDetector() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.detections.generateUploadUrl);
  const analyzeImage = useAction(api.detections.analyzeImage);
  const detections = useQuery(api.detections.getDetections);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be smaller than 10MB");
        return;
      }
      setSelectedImage(file);
      setCurrentResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload the image
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedImage.type },
        body: selectedImage,
      });

      if (!result.ok) {
        throw new Error("Failed to upload image");
      }

      const { storageId } = await result.json();

      // Step 3: Analyze the image
      const analysisResult = await analyzeImage({ storageId });
      setCurrentResult(analysisResult);

      if (analysisResult.isDrunk) {
        toast.error("⚠️ Signs of intoxication detected!");
      } else {
        toast.success("✅ No signs of intoxication detected");
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high": return "text-red-600 bg-red-50 border-red-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default: return "text-green-600 bg-green-50 border-green-200";
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Upload Image for Analysis
        </h2>
        
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              ref={fileInputRef}
              className="hidden"
            />
            
            {selectedImage ? (
              <div className="space-y-4">
                <img
                  src={URL.createObjectURL(selectedImage)}
                  alt="Selected"
                  className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                />
                <p className="text-sm text-gray-600">{selectedImage.name}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-6xl">📷</div>
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    Click to select an image
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports JPG, PNG, WebP (max 10MB)
                  </p>
                </div>
              </div>
            )}
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {selectedImage ? "Change Image" : "Select Image"}
            </button>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!selectedImage || isAnalyzing}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {isAnalyzing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Analyzing...
              </div>
            ) : (
              "🔍 Analyze for Intoxication"
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {currentResult && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Analysis Results
          </h2>
          
          <div className="space-y-6">
            <div className={`p-6 rounded-xl border-2 ${getRiskColor(currentResult.riskLevel)}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">
                  {currentResult.isDrunk ? "⚠️ Intoxication Detected" : "✅ No Intoxication Detected"}
                </h3>
                <span className="text-sm font-medium">
                  Risk Level: {currentResult.riskLevel.toUpperCase()}
                </span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium mb-2">Confidence Score</p>
                  <div className="bg-white/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{currentResult.confidence}%</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-current h-2 rounded-full transition-all"
                          style={{ width: `${currentResult.confidence}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="font-medium mb-2">Indicators Detected</p>
                  <div className="bg-white/50 rounded-lg p-3">
                    {currentResult.indicators.length > 0 ? (
                      <ul className="space-y-1">
                        {currentResult.indicators.map((indicator: string, index: number) => (
                          <li key={index} className="text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
                            {indicator}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm">No indicators detected</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {currentResult.isDrunk && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h4 className="font-bold text-red-800 mb-2">⚠️ Safety Warning</h4>
                <p className="text-red-700 text-sm">
                  If you or someone you know shows signs of intoxication, please do not drive. 
                  Use alternative transportation like rideshare services, public transit, or ask a sober friend for help.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Section */}
      {detections && detections.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Detections</h2>
          
          <div className="grid gap-4">
            {detections.slice(0, 5).map((detection) => (
              <div key={detection._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  {detection.imageUrl && (
                    <img
                      src={detection.imageUrl}
                      alt="Detection"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        detection.result.isDrunk 
                          ? "bg-red-100 text-red-800" 
                          : "bg-green-100 text-green-800"
                      }`}>
                        {detection.result.isDrunk ? "Intoxicated" : "Sober"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {detection.result.confidence}% confidence
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      {new Date(detection.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
