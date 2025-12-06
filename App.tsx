import React, { useState, useRef, useEffect } from 'react';
import { generateImageContent } from './services/geminiService';
import { GenerationSettings, AspectRatio } from './types';
import { DownloadIcon, UploadIcon, XMarkIcon, SparklesIcon, AdjustmentsIcon, TrashIcon, ArrowsPointingOutIcon } from './components/Icon';

const App: React.FC = () => {
  // State
  const [prompt, setPrompt] = useState<string>('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreenPrompt, setIsFullScreenPrompt] = useState<boolean>(false);
  
  // Settings State
  const [settings, setSettings] = useState<GenerationSettings>({
    aspectRatio: 'Auto',
    resolution: '1K',
    temperature: 1.0,
  });
  const [showSettings, setShowSettings] = useState<boolean>(true);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputSectionRef = useRef<HTMLDivElement>(null);

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (referenceImages.length + files.length > 10) {
      setError("Maximum 10 reference images allowed.");
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const fileArray = Array.from(files);
    // Check sizes
    const oversizedFiles = fileArray.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError("Some files were skipped because they exceed 5MB.");
    }

    const validFiles = fileArray.filter(file => file.size <= 5 * 1024 * 1024);
    if (validFiles.length === 0) {
       if (fileInputRef.current) fileInputRef.current.value = '';
       return;
    }

    const promises = validFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64Images => {
      setReferenceImages(prev => [...prev, ...base64Images]);
      if (oversizedFiles.length === 0) {
        setError(null);
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleClear = () => {
    setPrompt('');
    setReferenceImages([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageUrl = await generateImageContent(prompt, referenceImages, settings);
      setGeneratedImage(imageUrl);
      // Scroll to output
      setTimeout(() => {
        outputSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setError(err.message || "Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      // iOS Safari doesn't support download attribute well
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isWechat = /MicroMessenger/i.test(navigator.userAgent);

      if (isIOS || isWechat) {
        // For iOS/WeChat: open image in new tab for long-press save
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Save Image</title>
                <style>
                  body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
                  img { max-width: 100%; height: auto; }
                  p { text-align: center; color: #666; padding: 20px; }
                </style>
              </head>
              <body>
                <div>
                  <img src="${generatedImage}" alt="Generated Image" />
                  <p>Long press the image to save</p>
                </div>
              </body>
            </html>
          `);
          newWindow.document.close();
        }
      } else {
        // Standard download for desktop browsers
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `nano-banana-pro-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-900 font-sans selection:bg-gray-200">
      {/* Header */}
      <header className="flex-none p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
            <span className="bg-black text-white p-1 rounded-md"><SparklesIcon className="w-4 h-4" /></span>
            Nano Banana Pro
        </h1>
        <div className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded-full border border-gray-200">
          gemini-3-pro-image-preview
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">
          
          {/* Input Section */}
          <section className="space-y-6">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your imagination..."
                className="w-full text-base md:text-lg font-light placeholder-gray-300 border-none outline-none resize-none bg-transparent p-0 pr-12 -mt-3"
                rows={6}
                autoFocus
              />
              <button
                onClick={() => setIsFullScreenPrompt(true)}
                className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                title="Full Screen Edit"
              >
                <ArrowsPointingOutIcon className="w-5 h-5" />
              </button>
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {prompt.length}
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center gap-4">
               {/* Upload Button */}
               <div className="relative">
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={referenceImages.length >= 10}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    referenceImages.length > 0
                      ? 'bg-gray-100 text-gray-800 border border-gray-200' 
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  } ${referenceImages.length >= 10 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <UploadIcon className="w-4 h-4" />
                  {referenceImages.length > 0 ? `Images (${referenceImages.length}/10)` : 'Reference Image'}
                </button>
              </div>

              {/* Settings Toggle */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                    showSettings ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                }`}
              >
                <AdjustmentsIcon className="w-4 h-4" />
                Settings
              </button>

              {/* Clear Button */}
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                title="Clear all"
              >
                <TrashIcon className="w-4 h-4" />
                Clear
              </button>
              
              <div className="flex-1"></div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className={`flex items-center gap-2 px-8 py-3 rounded-full text-base font-semibold transition-all shadow-sm ${
                  !prompt.trim() || isGenerating
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800 hover:shadow-lg active:scale-95'
                }`}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Dreaming...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    Generate
                  </>
                )}
              </button>
            </div>

            {/* Reference Images List */}
            {referenceImages.length > 0 && (
              <div className="flex flex-wrap gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
                {referenceImages.map((img, index) => (
                    <div key={index} className="relative group">
                        <img 
                            src={img} 
                            alt={`Reference ${index + 1}`} 
                            className="h-24 w-24 object-cover rounded-lg border border-gray-200 shadow-sm" 
                        />
                        <button
                            onClick={() => handleRemoveReferenceImage(index)}
                            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border border-gray-200 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <XMarkIcon className="w-3 h-3" />
                        </button>
                    </div>
                ))}
              </div>
            )}

            {/* Expanded Settings Panel */}
            {showSettings && (
               <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Aspect Ratio</label>
                    <div className="flex flex-wrap gap-2">
                      {(['Auto', '1:1', '3:4', '4:3', '9:16', '16:9'] as AspectRatio[]).map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setSettings(s => ({ ...s, aspectRatio: ratio }))}
                          className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
                            settings.aspectRatio === ratio
                              ? 'bg-white border-black text-black shadow-sm font-medium'
                              : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between">
                      <span>Temperature</span>
                      <span>{settings.temperature.toFixed(1)}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.temperature}
                      onChange={(e) => setSettings(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                  </div>
               </div>
            )}
            
            {error && (
               <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
                 {error}
               </div>
            )}
          </section>

          {/* Output Section */}
          <section ref={outputSectionRef} className="pb-24">
            {generatedImage ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="group relative rounded-2xl overflow-hidden shadow-2xl bg-gray-100 border border-gray-100">
                  <img
                    src={generatedImage}
                    alt={prompt}
                    className="w-full h-auto object-contain max-h-[80vh]"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />
                  
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <button
                      onClick={handleDownload}
                      className="bg-white/90 backdrop-blur-sm text-black p-3 rounded-full shadow-lg hover:bg-white hover:scale-105 transition-all"
                      title="Download Image"
                    >
                      <DownloadIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-400">Generated with Gemini 3 Pro Image Preview</p>
                </div>
              </div>
            ) : (
                !isGenerating && (
                    <div className="h-64 md:h-96 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-3xl">
                        <SparklesIcon className="w-12 h-12 mb-4 text-gray-200" />
                        <p className="font-light text-lg">Your masterpiece will appear here</p>
                    </div>
                )
            )}
          </section>
        </div>
      </main>
      
      {/* Full Screen Prompt Modal */}
      {isFullScreenPrompt && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-200">
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Edit Prompt</h2>
            <button
              onClick={() => setIsFullScreenPrompt(false)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
            >
              <span className="text-sm">Done</span>
            </button>
          </div>
          <div className="flex-1 p-6 relative">
              <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your imagination..."
                  className="w-full h-full text-lg md:text-xl font-light placeholder-gray-300 border-none outline-none resize-none bg-transparent"
                  autoFocus
              />
              <div className="absolute bottom-6 right-6 text-sm text-gray-400">
                  {prompt.length} characters
              </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <footer className="py-6 text-center text-gray-400 text-xs border-t border-gray-100 bg-white">
          <p>This is a demo application. Use responsibly. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Pricing Info</a></p>
      </footer>
    </div>
  );
};

export default App;