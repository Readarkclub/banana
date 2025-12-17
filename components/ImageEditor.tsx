import React, { useRef, useState, useEffect } from 'react';
import { XMarkIcon } from './Icon';

interface ImageEditorProps {
  imageSrc: string;
  onClose: () => void;
  onComplete: (compositedImage: string, prompt: string) => void;
}

const COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#a855f7' },
];

const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onClose, onComplete }) => {
  const [prompt, setPrompt] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeColor, setActiveColor] = useState(COLORS[0].value);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize canvas size when image loads
  useEffect(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (img && canvas && container) {
      const resizeCanvas = () => {
        // Match canvas size to the displayed image size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Setup default context
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = activeColor;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      };

      if (img.complete) {
        resizeCanvas();
      } else {
        img.onload = resizeCanvas;
      }
    }
  }, [imageSrc]);

  // Update context when color changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = activeColor;
    }
  }, [activeColor]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.beginPath(); // Reset path
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleComplete = () => {
    if (!prompt.trim()) {
        alert("Please describe the change you want to make.");
        return;
    }

    const canvas = canvasRef.current;
    const img = imageRef.current;

    if (!canvas || !img) return;

    // Create a temporary canvas to composite the image and the drawing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.naturalWidth;
    tempCanvas.height = img.naturalHeight;
    const ctx = tempCanvas.getContext('2d');

    if (ctx) {
      // 1. Draw the original image
      ctx.drawImage(img, 0, 0);

      // 2. Draw the annotation (need to scale it up if displayed size != natural size)
      // The drawing canvas matches the *displayed* size (img.width/height)
      // We need to draw it onto the tempCanvas which matches *natural* size
      ctx.drawImage(canvas, 0, 0, img.width, img.height, 0, 0, img.naturalWidth, img.naturalHeight);

      // 3. Export to base64
      const compositedImage = tempCanvas.toDataURL('image/png');
      onComplete(compositedImage, prompt);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeColor }}></span>
            Edit & Annotate
          </h3>
          
          <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-full">
            <span className="text-xs font-medium text-gray-500 uppercase">Brush Color</span>
            <div className="flex gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setActiveColor(color.value)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    activeColor === color.value ? 'border-gray-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div 
            ref={containerRef}
            className="flex-1 bg-gray-100 relative overflow-hidden flex items-center justify-center p-4"
        >
            <div className="relative inline-block shadow-lg">
                <img 
                    ref={imageRef}
                    src={imageSrc} 
                    alt="To edit" 
                    className="max-h-[60vh] max-w-full object-contain select-none pointer-events-none"
                />
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={draw}
                    className="absolute inset-0 touch-none cursor-crosshair"
                />
            </div>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm text-sm text-gray-600 pointer-events-none">
                Draw on the image to mark the area
            </div>
        </div>

        {/* Footer / Input */}
        <div className="p-6 border-t border-gray-100 bg-white space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What should be changed?</label>
                <div className="flex gap-4">
                    <input 
                        type="text" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="E.g., Change the red circled object to a blue vase"
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleComplete()}
                        autoFocus
                    />
                    <button
                        onClick={handleComplete}
                        disabled={!prompt.trim()}
                        className="px-8 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95"
                    >
                        Generate
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
