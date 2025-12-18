import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { Move, ZoomIn, ZoomOut, RotateCw, Shirt, Save, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PRODUCT_TYPES = {
  tshirt: { 
    name: 'T-Shirt', 
    baseColor: '#1a1a1a',
    printArea: { x: 25, y: 20, width: 50, height: 45 },
    // Print dimensions for Printify (in pixels)
    printDimensions: { width: 4000, height: 4500 }
  },
  hoodie: { 
    name: 'Hoodie', 
    baseColor: '#1a1a1a',
    printArea: { x: 25, y: 22, width: 50, height: 40 },
    printDimensions: { width: 4000, height: 4000 }
  },
};

const ProductCanvas = forwardRef(({ 
  generatedImage, 
  onSave, 
  isSaving,
  productType,
  setProductType,
  canvasData,
  setCanvasData,
  showSaveButton = true,
  onExport,
}, ref) => {
  const canvasRef = useRef(null);
  const designImgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isExporting, setIsExporting] = useState(false);

  const product = PRODUCT_TYPES[productType];

  // Initialize canvas data
  useEffect(() => {
    if (!canvasData.x && !canvasData.y) {
      setCanvasData({
        x: product.printArea.x + product.printArea.width / 2 - 15,
        y: product.printArea.y + product.printArea.height / 2 - 15,
        scale: 1,
        rotation: 0,
      });
    }
  }, [productType]);

  /**
   * Export the design as a PNG suitable for Printify
   * Creates a transparent PNG with the design positioned correctly
   */
  const exportDesignAsPNG = useCallback(async () => {
    if (!generatedImage) {
      throw new Error('No design to export');
    }

    setIsExporting(true);

    try {
      // Create a canvas for the final output
      const outputCanvas = document.createElement('canvas');
      const ctx = outputCanvas.getContext('2d');
      
      // Set canvas to Printify print dimensions
      const printDims = product.printDimensions;
      outputCanvas.width = printDims.width;
      outputCanvas.height = printDims.height;
      
      // Keep transparent background for Printify
      ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
      
      // Load the design image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load design image'));
        img.src = generatedImage;
      });

      // Calculate position based on canvas data
      // Map the percentage-based position to print dimensions
      const printArea = product.printArea;
      const printAreaPixels = {
        x: (printArea.x / 100) * printDims.width,
        y: (printArea.y / 100) * printDims.height,
        width: (printArea.width / 100) * printDims.width,
        height: (printArea.height / 100) * printDims.height,
      };

      // Calculate design position within print area
      const designX = ((canvasData.x - printArea.x) / printArea.width) * printAreaPixels.width + printAreaPixels.x;
      const designY = ((canvasData.y - printArea.y) / printArea.height) * printAreaPixels.height + printAreaPixels.y;
      
      // Calculate design size (base size scaled)
      const baseSize = Math.min(printAreaPixels.width, printAreaPixels.height) * 0.6;
      const designSize = baseSize * canvasData.scale;
      
      // Apply transformations
      ctx.save();
      ctx.translate(designX, designY);
      ctx.rotate((canvasData.rotation * Math.PI) / 180);
      ctx.scale(canvasData.scale, canvasData.scale);
      
      // Draw centered
      ctx.drawImage(
        img, 
        -designSize / (2 * canvasData.scale), 
        -designSize / (2 * canvasData.scale), 
        designSize / canvasData.scale, 
        designSize / canvasData.scale
      );
      
      ctx.restore();

      // Convert to blob
      const blob = await new Promise((resolve) => {
        outputCanvas.toBlob(resolve, 'image/png', 1.0);
      });

      // Convert to base64 for upload
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      return {
        blob,
        base64,
        width: outputCanvas.width,
        height: outputCanvas.height,
      };
    } finally {
      setIsExporting(false);
    }
  }, [generatedImage, canvasData, product]);

  // Expose export function via ref
  useImperativeHandle(ref, () => ({
    exportDesign: exportDesignAsPNG,
    getCanvasData: () => canvasData,
  }));

  const handleExport = async () => {
    try {
      const exportData = await exportDesignAsPNG();
      if (onExport) {
        onExport(exportData);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleMouseDown = (e) => {
    if (!generatedImage) return;
    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - (canvasData.x / 100) * rect.width,
        y: e.clientY - (canvasData.y / 100) * rect.height,
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const newY = ((e.clientY - dragStart.y) / rect.height) * 100;
    
    setCanvasData(prev => ({
      ...prev,
      x: Math.max(0, Math.min(100, newX)),
      y: Math.max(0, Math.min(100, newY)),
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-wrap gap-4">
        {/* Product type selector */}
        <Tabs value={productType} onValueChange={setProductType}>
          <TabsList className="bg-gray-800">
            {Object.entries(PRODUCT_TYPES).map(([key, val]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                {val.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Scale control */}
          <div className="flex items-center gap-2">
            <ZoomOut className="w-4 h-4 text-gray-400" />
            <Slider
              value={[canvasData.scale * 100]}
              onValueChange={([val]) => setCanvasData(prev => ({ ...prev, scale: val / 100 }))}
              min={50}
              max={150}
              step={5}
              className="w-24"
            />
            <ZoomIn className="w-4 h-4 text-gray-400" />
          </div>

          {/* Rotation */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCanvasData(prev => ({ 
              ...prev, 
              rotation: (prev.rotation + 90) % 360 
            }))}
            className="text-gray-400 hover:text-white"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {showSaveButton && (
            <Button
              onClick={onSave}
              disabled={!generatedImage || isSaving || isExporting}
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {isSaving || isExporting ? (
                <>Processing...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Product
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#0a0a0a_100%)]">
        <div 
          ref={canvasRef}
          className="relative w-full max-w-md aspect-[3/4] bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
          style={{ backgroundColor: product.baseColor }}
        >
          {/* Product outline */}
          {productType === 'tshirt' && (
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
              <path
                d="M30,15 L25,20 L15,18 L12,25 L20,30 L20,90 L80,90 L80,30 L88,25 L85,18 L75,20 L70,15 L55,15 Q50,20 45,15 Z"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.5"
              />
            </svg>
          )}
          
          {productType === 'hoodie' && (
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
              <path
                d="M30,18 L25,23 L12,20 L8,30 L18,35 L18,92 L82,92 L82,35 L92,30 L88,20 L75,23 L70,18 L55,18 Q50,25 45,18 Z"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.5"
              />
              {/* Hood */}
              <path
                d="M45,18 Q50,5 55,18"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.5"
              />
            </svg>
          )}

          {/* Print area indicator */}
          <div 
            className="absolute border border-dashed border-gray-600 rounded"
            style={{
              left: `${product.printArea.x}%`,
              top: `${product.printArea.y}%`,
              width: `${product.printArea.width}%`,
              height: `${product.printArea.height}%`,
            }}
          >
            {!generatedImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Shirt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Generate a design to start</p>
                </div>
              </div>
            )}
          </div>

          {/* Draggable design */}
          {generatedImage && (
            <motion.div
              className={cn(
                "absolute cursor-move",
                isDragging && "cursor-grabbing"
              )}
              style={{
                left: `${canvasData.x}%`,
                top: `${canvasData.y}%`,
                transform: `translate(-50%, -50%) scale(${canvasData.scale}) rotate(${canvasData.rotation}deg)`,
              }}
              onMouseDown={handleMouseDown}
            >
              <img 
                ref={designImgRef}
                src={generatedImage} 
                alt="Design"
                className="w-32 h-32 object-contain pointer-events-none select-none"
                draggable={false}
                crossOrigin="anonymous"
              />
              
              {/* Move indicator */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity">
                <Badge className="bg-black/80 text-white text-[10px]">
                  <Move className="w-3 h-3 mr-1" />
                  Drag to move
                </Badge>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 border-t border-gray-800 bg-gray-950">
        <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Move className="w-3 h-3" /> Drag to position
          </span>
          <span className="flex items-center gap-1">
            <ZoomIn className="w-3 h-3" /> Slider to resize
          </span>
          <span className="flex items-center gap-1">
            <RotateCw className="w-3 h-3" /> Click to rotate
          </span>
        </div>
      </div>
    </div>
  );
});

ProductCanvas.displayName = 'ProductCanvas';

export default ProductCanvas;
