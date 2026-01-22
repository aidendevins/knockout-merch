import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Move, ZoomIn, ZoomOut, RotateCw, Save, Hand, MousePointer2, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Product type configurations with print area definitions
const PRODUCT_TYPES = {
  tshirt: {
    name: 'T-Shirt',
    baseColor: '#1a1a1a',
    // Print area as percentage of canvas (centered on chest)
    printArea: { x: 0.25, y: 0.28, width: 0.50, height: 0.45 },
    // Print dimensions for Printify (in pixels) - standard DTG print
    printDimensions: { width: 4000, height: 4500 }
  },
  hoodie: {
    name: 'Hoodie',
    baseColor: '#1a1a1a',
    printArea: { x: 0.25, y: 0.30, width: 0.50, height: 0.40 },
    printDimensions: { width: 4000, height: 4000 }
  },
};

// Canvas dimensions (working resolution)
const CANVAS_WIDTH = 660;
const CANVAS_HEIGHT = 660;

// Helper: Wrap text for multi-line rendering
const wrapText = (ctx, text, maxWidth, fontSize) => {
  const words = text.split(' ');
  let line = '';
  const lines = [];

  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line !== '') {
      lines.push(line.trim());
      line = word + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  return lines;
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
  selectedColor = 'black', // 'black' or 'white' - t-shirt color for preview only (not generation background)
  onColorChange, // Callback when t-shirt color changes
  selectedMask,
  setSelectedMask,
}, ref) => {
  // Canvas refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Canvas contexts
  const [ctx, setCtx] = useState(null);
  const [previewCtx, setPreviewCtx] = useState(null);

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Tool state
  const [activeTool, setActiveTool] = useState('select'); // 'select' | 'pan'
  const [showGrid, setShowGrid] = useState(true);

  // Design state - supports multiple layers
  const [designLayers, setDesignLayers] = useState({
    design: null, // Main AI-generated design
    text: null,   // Text layer (future)
    sprites: [],  // Sticker/sprite layers (future)
  });

  // Selection state
  const [selectedLayerId, setSelectedLayerId] = useState('design');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startDimensions, setStartDimensions] = useState({ x: 0, y: 0, width: 0, height: 0, rotation: 0 });

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Loading/export state
  const [isExporting, setIsExporting] = useState(false);
  const [designImage, setDesignImage] = useState(null);

  // Product mockup images
  const [tshirtImages, setTshirtImages] = useState({ black: null, white: null, pink: null });
  const [tshirtMockupsLoaded, setTshirtMockupsLoaded] = useState({ black: false, white: false, pink: false });

  // Get product config and override baseColor with selectedColor
  const product = useMemo(() => {
    const baseProduct = PRODUCT_TYPES[productType];
    let effectiveColor = '#1a1a1a'; // default black
    if (selectedColor === 'white') {
      effectiveColor = '#f5f5f5';
    } else if (selectedColor === 'light-pink') {
      effectiveColor = '#fce7f3'; // light pink
    }
    return {
      ...baseProduct,
      baseColor: effectiveColor,
    };
  }, [productType, selectedColor]);

  // Initialize canvas contexts
  useEffect(() => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;

    if (canvas && previewCanvas) {
      const context = canvas.getContext('2d');
      const previewContext = previewCanvas.getContext('2d');
      setCtx(context);
      setPreviewCtx(previewContext);
    }
  }, []);

  // Load t-shirt mockup images (black, white, and pink)
  useEffect(() => {
    // Load black t-shirt
    const blackImg = new Image();
    blackImg.onload = () => {
      setTshirtImages(prev => ({ ...prev, black: blackImg }));
      setTshirtMockupsLoaded(prev => ({ ...prev, black: true }));
    };
    blackImg.onerror = () => {
      console.error('Failed to load black t-shirt mockup image');
      setTshirtMockupsLoaded(prev => ({ ...prev, black: false }));
    };
    blackImg.src = '/tshirt-black.png';

    // Load white t-shirt
    const whiteImg = new Image();
    whiteImg.onload = () => {
      setTshirtImages(prev => ({ ...prev, white: whiteImg }));
      setTshirtMockupsLoaded(prev => ({ ...prev, white: true }));
    };
    whiteImg.onerror = () => {
      console.error('Failed to load white t-shirt mockup image');
      setTshirtMockupsLoaded(prev => ({ ...prev, white: false }));
    };
    whiteImg.src = '/tshirt-white.png';

    // Load pink t-shirt
    const pinkImg = new Image();
    pinkImg.onload = () => {
      setTshirtImages(prev => ({ ...prev, pink: pinkImg }));
      setTshirtMockupsLoaded(prev => ({ ...prev, pink: true }));
    };
    pinkImg.onerror = () => {
      console.error('Failed to load pink t-shirt mockup image');
      setTshirtMockupsLoaded(prev => ({ ...prev, pink: false }));
    };
    pinkImg.src = '/tshirt-pink.png';
  }, []);

  // Load the generated image when it changes
  useEffect(() => {
    if (!generatedImage) {
      setDesignImage(null);
      setDesignLayers(prev => ({ ...prev, design: null }));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setDesignImage(img);

      // Calculate initial positioning within print area
      const printArea = product.printArea;
      const printAreaWidth = CANVAS_WIDTH * printArea.width;
      const printAreaHeight = CANVAS_HEIGHT * printArea.height;

      // Scale image to fit nicely in print area (60% of area)
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      let designWidth = printAreaWidth * 0.6;
      let designHeight = designWidth / aspectRatio;

      if (designHeight > printAreaHeight * 0.6) {
        designHeight = printAreaHeight * 0.6;
        designWidth = designHeight * aspectRatio;
      }

      // Center in print area
      const x = CANVAS_WIDTH * (printArea.x + printArea.width / 2) - designWidth / 2;
      const y = CANVAS_HEIGHT * (printArea.y + printArea.height / 2) - designHeight / 2;

      setDesignLayers(prev => ({
        ...prev,
        design: {
          img,
          url: generatedImage,
          x,
          y,
          width: designWidth,
          height: designHeight,
          rotation: canvasData.rotation || 0,
          opacity: 1,
        }
      }));

      setSelectedLayerId('design');
    };
    img.onerror = () => {
      console.error('Failed to load generated image');
    };
    img.src = generatedImage;
  }, [generatedImage, product.printArea]);

  // Sync canvasData with design layer (for backward compatibility)
  useEffect(() => {
    if (designLayers.design && setCanvasData) {
      const d = designLayers.design;
      const printArea = product.printArea;

      // Convert pixel position back to percentage
      const xPercent = ((d.x + d.width / 2) / CANVAS_WIDTH) * 100;
      const yPercent = ((d.y + d.height / 2) / CANVAS_HEIGHT) * 100;

      // Calculate scale based on design size vs base size
      const baseSize = CANVAS_WIDTH * printArea.width * 0.6 * 0.5; // Half of initial size
      const currentSize = Math.max(d.width, d.height);
      const scale = currentSize / baseSize / 2;

      setCanvasData({
        x: xPercent,
        y: yPercent,
        scale: scale,
        rotation: d.rotation || 0,
      });
    }
  }, [designLayers.design]);

  // Update layer helper
  const updateLayer = useCallback((layerId, updates) => {
    setDesignLayers(prev => ({
      ...prev,
      [layerId]: { ...prev[layerId], ...updates }
    }));
  }, []);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    if (!ctx || !canvasRef.current) return;

    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Fill background with light neutral color
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, w, h);

    // Draw t-shirt mockup image if loaded (select based on color)
    let currentColor = 'black'; // default
    if (selectedColor === 'white') {
      currentColor = 'white';
    } else if (selectedColor === 'light-pink') {
      currentColor = 'pink';
    }
    const currentTshirtImage = tshirtImages[currentColor];
    const isMockupLoaded = tshirtMockupsLoaded[currentColor];
    
    if (currentTshirtImage && isMockupLoaded) {
      // Draw the t-shirt image to fill the canvas
      ctx.drawImage(currentTshirtImage, 0, 0, w, h);
    }

    // Draw print area guide
    if (showGrid) {
      const area = product.printArea;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(w * area.x, h * area.y, w * area.width, h * area.height);
      ctx.setLineDash([]);
    }

    // Draw design layer
    const design = designLayers.design;
    if (design && design.img) {
      ctx.save();
      ctx.globalAlpha = design.opacity || 1;

      // Apply rotation around center
      if (design.rotation) {
        const cx = design.x + design.width / 2;
        const cy = design.y + design.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate((design.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      ctx.drawImage(design.img, design.x, design.y, design.width, design.height);
      ctx.restore();

      // Draw selection box if selected
      if (selectedLayerId === 'design') {
        drawSelectionBox(ctx, design);
      }
    }

    // Draw placeholder if no design
    if (!design) {
      const area = product.printArea;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Generate a design to start',
        w * (area.x + area.width / 2),
        h * (area.y + area.height / 2)
      );
    }
  }, [ctx, product, productType, designLayers, selectedLayerId, showGrid, selectedColor, tshirtImages, tshirtMockupsLoaded]);

  // Draw selection box with handles
  const drawSelectionBox = (ctx, element) => {
    if (!element) return;

    ctx.save();

    const { x, y, width, height, rotation = 0 } = element;
    const cx = x + width / 2;
    const cy = y + height / 2;

    // Apply rotation
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    // Selection box
    ctx.strokeStyle = '#ec4899'; // Pink color for Valentine's theme
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Rotation handle
    const knobDist = 25;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx, y - knobDist);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, y - knobDist, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.stroke();

    // Corner handles
    const handleSize = 10;
    const handles = [
      { x: x, y: y }, // TL
      { x: x + width, y: y }, // TR
      { x: x, y: y + height }, // BL
      { x: x + width, y: y + height }, // BR
    ];

    ctx.fillStyle = '#fff';
    handles.forEach(h => {
      ctx.beginPath();
      ctx.rect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  };

  // Redraw on state changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, designLayers, selectedLayerId, showGrid, product]);

  // Keyboard shortcuts for tools
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;

      // Space for temporary panning
      if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      // V for select tool
      if (e.key === 'v' && !e.target.matches('input, textarea')) {
        setActiveTool('select');
      }

      // H for pan tool
      if (e.key === 'h' && !e.target.matches('input, textarea')) {
        setActiveTool('pan');
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Wheel handler for zoom/pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        e.preventDefault();
        const delta = -e.deltaY;
        const scaleAmount = 0.1;
        const newZoom = delta > 0 ? zoom + scaleAmount : zoom - scaleAmount;
        setZoom(Math.max(0.25, Math.min(3, newZoom)));
      } else {
        // Pan
        e.preventDefault();
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [zoom]);

  // Get canvas coordinates from mouse event
  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // Check if point is on rotation handle
  const isOnRotationHandle = (canvasX, canvasY, element) => {
    if (!element) return false;

    const cx = element.x + element.width / 2;
    const cy = element.y;
    const knobY = cy - 25;

    // Rotate point to check against unrotated handle position
    const rotation = element.rotation || 0;
    const rad = (-rotation * Math.PI) / 180;
    const rotCx = element.x + element.width / 2;
    const rotCy = element.y + element.height / 2;
    const rotatedX = Math.cos(rad) * (canvasX - rotCx) - Math.sin(rad) * (canvasY - rotCy) + rotCx;
    const rotatedY = Math.sin(rad) * (canvasX - rotCx) + Math.cos(rad) * (canvasY - rotCy) + rotCy;

    const dist = Math.sqrt(Math.pow(rotatedX - cx, 2) + Math.pow(rotatedY - knobY, 2));
    return dist <= 10;
  };

  // Check if point is on resize handle, returns handle name or null
  const getResizeHandle = (canvasX, canvasY, element) => {
    if (!element) return null;

    const handleSize = 14;
    const { x, y, width, height, rotation = 0 } = element;

    // Rotate point to element's local space
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rad = (-rotation * Math.PI) / 180;
    const rotatedX = Math.cos(rad) * (canvasX - cx) - Math.sin(rad) * (canvasY - cy) + cx;
    const rotatedY = Math.sin(rad) * (canvasX - cx) + Math.cos(rad) * (canvasY - cy) + cy;

    const handles = [
      { name: 'nw', x: x, y: y },
      { name: 'ne', x: x + width, y: y },
      { name: 'sw', x: x, y: y + height },
      { name: 'se', x: x + width, y: y + height },
    ];

    for (const h of handles) {
      if (rotatedX >= h.x - handleSize && rotatedX <= h.x + handleSize &&
        rotatedY >= h.y - handleSize && rotatedY <= h.y + handleSize) {
        return h.name;
      }
    }

    return null;
  };

  // Check if point is inside element bounds
  const isInsideElement = (canvasX, canvasY, element) => {
    if (!element) return false;

    const { x, y, width, height, rotation = 0 } = element;
    const cx = x + width / 2;
    const cy = y + height / 2;

    // Rotate point to element's local space
    const rad = (-rotation * Math.PI) / 180;
    const rotatedX = Math.cos(rad) * (canvasX - cx) - Math.sin(rad) * (canvasY - cy) + cx;
    const rotatedY = Math.sin(rad) * (canvasX - cx) + Math.cos(rad) * (canvasY - cy) + cy;

    return rotatedX >= x && rotatedX <= x + width && rotatedY >= y && rotatedY <= y + height;
  };

  // Mouse down handler
  const handleMouseDown = useCallback((e) => {
    const { x: canvasX, y: canvasY } = getCanvasCoords(e);

    // Check for pan mode
    if (isSpacePressed || activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    const design = designLayers.design;
    if (!design) return;

    // Check rotation handle first
    if (selectedLayerId === 'design' && isOnRotationHandle(canvasX, canvasY, design)) {
      setIsRotating(true);
      const cx = design.x + design.width / 2;
      const cy = design.y + design.height / 2;
      setStartDimensions({
        rotation: design.rotation || 0,
        centerX: cx,
        centerY: cy,
      });
      return;
    }

    // Check resize handles
    if (selectedLayerId === 'design') {
      const handle = getResizeHandle(canvasX, canvasY, design);
      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
        setDragStart({ x: canvasX, y: canvasY });
        setStartDimensions({
          x: design.x,
          y: design.y,
          width: design.width,
          height: design.height,
          rotation: design.rotation || 0,
        });
        return;
      }
    }

    // Check if clicking inside design
    if (isInsideElement(canvasX, canvasY, design)) {
      setSelectedLayerId('design');
      setIsDragging(true);
      setDragStart({ x: canvasX, y: canvasY });
      setStartDimensions({
        x: design.x,
        y: design.y,
        width: design.width,
        height: design.height,
        rotation: design.rotation || 0,
      });
      return;
    }

    // Click outside - deselect
    setSelectedLayerId(null);
  }, [getCanvasCoords, isSpacePressed, activeTool, designLayers, selectedLayerId]);

  // Mouse move handler
  const handleMouseMove = useCallback((e) => {
    // Handle panning
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!selectedLayerId) return;
    if (!isDragging && !isResizing && !isRotating) return;

    const { x: canvasX, y: canvasY } = getCanvasCoords(e);
    const design = designLayers.design;
    if (!design) return;

    // Get print area bounds
    const printArea = product.printArea;
    const bounds = {
      minX: CANVAS_WIDTH * printArea.x,
      maxX: CANVAS_WIDTH * (printArea.x + printArea.width),
      minY: CANVAS_HEIGHT * printArea.y,
      maxY: CANVAS_HEIGHT * (printArea.y + printArea.height),
    };

    if (isDragging) {
      const dx = canvasX - dragStart.x;
      const dy = canvasY - dragStart.y;

      let newX = startDimensions.x + dx;
      let newY = startDimensions.y + dy;
      const w = startDimensions.width;
      const h = startDimensions.height;

      // Constrain to print area
      newX = Math.max(bounds.minX, Math.min(newX, bounds.maxX - w));
      newY = Math.max(bounds.minY, Math.min(newY, bounds.maxY - h));

      setDesignLayers(prev => ({
        ...prev,
        design: { ...prev.design, x: newX, y: newY }
      }));
    } else if (isResizing) {
      let dx = canvasX - dragStart.x;
      let dy = canvasY - dragStart.y;

      // Rotate delta to local space if rotated
      if (startDimensions.rotation) {
        const rad = (-startDimensions.rotation * Math.PI) / 180;
        const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);
        dx = localDx;
        dy = localDy;
      }

      const { x, y, width, height } = startDimensions;
      let newX = x;
      let newY = y;
      let newW = width;
      let newH = height;

      // Maintain aspect ratio for corners
      const aspectRatio = width / height;

      if (resizeHandle === 'se') {
        newW = Math.max(50, width + dx);
        newH = newW / aspectRatio;
      } else if (resizeHandle === 'sw') {
        newW = Math.max(50, width - dx);
        newH = newW / aspectRatio;
        newX = x + (width - newW);
      } else if (resizeHandle === 'ne') {
        newW = Math.max(50, width + dx);
        newH = newW / aspectRatio;
        newY = y + (height - newH);
      } else if (resizeHandle === 'nw') {
        newW = Math.max(50, width - dx);
        newH = newW / aspectRatio;
        newX = x + (width - newW);
        newY = y + (height - newH);
      }

      // Constrain to bounds
      if (newX < bounds.minX) {
        newX = bounds.minX;
        newW = x + width - bounds.minX;
        newH = newW / aspectRatio;
      }
      if (newX + newW > bounds.maxX) {
        newW = bounds.maxX - newX;
        newH = newW / aspectRatio;
      }
      if (newY < bounds.minY) {
        newY = bounds.minY;
        newH = y + height - bounds.minY;
        newW = newH * aspectRatio;
      }
      if (newY + newH > bounds.maxY) {
        newH = bounds.maxY - newY;
        newW = newH * aspectRatio;
      }

      setDesignLayers(prev => ({
        ...prev,
        design: { ...prev.design, x: newX, y: newY, width: newW, height: newH }
      }));
    } else if (isRotating) {
      const cx = startDimensions.centerX;
      const cy = startDimensions.centerY;

      // Calculate angle from center to mouse
      const angle = Math.atan2(canvasY - cy, canvasX - cx) * (180 / Math.PI);
      const rotation = angle + 90;

      setDesignLayers(prev => ({
        ...prev,
        design: { ...prev.design, rotation }
      }));
    }
  }, [isPanning, lastMousePos, selectedLayerId, isDragging, isResizing, isRotating, getCanvasCoords, designLayers, product, dragStart, startDimensions, resizeHandle]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
    setIsPanning(false);
    setResizeHandle(null);
  }, []);

  // Export design as high-resolution PNG
  const exportDesignAsPNG = useCallback(async () => {
    const design = designLayers.design;
    if (!design || !design.img) {
      throw new Error('No design to export');
    }

    setIsExporting(true);

    try {
      const printDims = product.printDimensions;
      const outputCanvas = document.createElement('canvas');
      const ctx = outputCanvas.getContext('2d');

      outputCanvas.width = printDims.width;
      outputCanvas.height = printDims.height;

      // Keep transparent background for Printify
      ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);

      // Calculate scale from working canvas to print dimensions
      const scale = printDims.width / CANVAS_WIDTH;

      // Scale design position and size
      const scaledX = design.x * scale;
      const scaledY = design.y * scale;
      const scaledWidth = design.width * scale;
      const scaledHeight = design.height * scale;

      // Apply transformations
      ctx.save();

      if (design.rotation) {
        const cx = scaledX + scaledWidth / 2;
        const cy = scaledY + scaledHeight / 2;
        ctx.translate(cx, cy);
        ctx.rotate((design.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      ctx.globalAlpha = design.opacity || 1;
      ctx.drawImage(design.img, scaledX, scaledY, scaledWidth, scaledHeight);
      ctx.restore();

      // Convert to blob and base64
      const blob = await new Promise((resolve) => {
        outputCanvas.toBlob(resolve, 'image/png', 1.0);
      });

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
  }, [designLayers.design, product]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    exportDesign: exportDesignAsPNG,
    getCanvasData: () => canvasData,
    getDesignLayers: () => designLayers,
  }));

  // Handle export button click
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

  // Get cursor style
  const getCursorStyle = () => {
    if (isPanning) return 'cursor-grabbing';
    if (isSpacePressed || activeTool === 'pan') return 'cursor-grab';
    if (isResizing) return 'cursor-nwse-resize';
    if (isRotating) return 'cursor-alias';
    if (isDragging) return 'cursor-move';
    return 'cursor-default';
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Toolbar */}
      <div className="h-12 bg-gradient-to-r from-red-950/30 to-black border-b border-pink-900/30 flex items-center justify-between px-4">
        {/* Left: Tools */}
        <div className="flex items-center gap-2">
          {/* Tool switcher */}
          <div className="flex bg-black/40 border border-pink-900/30 rounded-lg p-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setActiveTool('select')}
              className={cn(
                "h-7 w-7 relative",
                activeTool === 'select' ? "text-white bg-pink-600" : "text-white/60 hover:text-white hover:bg-pink-600/20"
              )}
            >
              <MousePointer2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setActiveTool('pan')}
              className={cn(
                "h-7 w-7",
                activeTool === 'pan' ? "text-white bg-pink-600" : "text-white/60 hover:text-white hover:bg-pink-600/20"
              )}
            >
              <Hand className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="w-px h-6 bg-pink-900/30 mx-2" />
          
          {/* Grid toggle */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowGrid(!showGrid)}
            className={cn(
              "h-8 w-8 hover:bg-pink-600/10",
              showGrid ? "text-white" : "text-white/40"
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </div>

        {/* Right: Zoom and Actions */}
        <div className="flex items-center gap-4">
          {/* Zoom controls */}
          <div className="flex items-center gap-2 bg-black/40 border border-pink-900/30 rounded-lg px-2 py-1">
            <button 
              onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} 
              className="text-white/60 hover:text-white px-1"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-white w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button 
              onClick={() => setZoom(z => Math.min(3, z + 0.1))} 
              className="text-white/60 hover:text-white px-1"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Save button */}
          {showSaveButton && (
            <Button
              onClick={onSave}
              disabled={!designLayers.design || isSaving || isExporting}
              className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-bold shadow-lg shadow-pink-600/30"
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
      <div
        ref={containerRef}
        className={cn(
          "flex-1 relative overflow-hidden",
          getCursorStyle()
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid Background */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)'
            }}
          />
        )}

        {/* Canvas Container with Transform */}
        <div
          className="absolute transform-gpu origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            left: '50%',
            top: '50%',
            marginLeft: -CANVAS_WIDTH / 2,
            marginTop: -CANVAS_HEIGHT / 2,
          }}
        >
          {/* Shadow for depth */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          />

          {/* Main canvas */}
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="rounded-2xl"
          />

          {/* Preview canvas for overlays */}
          <canvas
            ref={previewCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="absolute inset-0 pointer-events-none"
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="h-10 border-t border-pink-900/30 bg-gradient-to-r from-red-950/30 to-black flex items-center justify-center">
        <div className="flex items-center gap-6 text-xs text-white/60">
          <span className="flex items-center gap-1">
            <Move className="w-3 h-3" /> Drag to position
          </span>
          <span className="flex items-center gap-1">
            <ZoomIn className="w-3 h-3" /> Corners to resize
          </span>
          <span className="flex items-center gap-1">
            <RotateCw className="w-3 h-3" /> Top handle to rotate
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[10px] bg-pink-600/20 border border-pink-900/30 px-1 rounded">Space</span> Hold to pan
          </span>
        </div>
      </div>
    </div>
  );
});

ProductCanvas.displayName = 'ProductCanvas';

export default ProductCanvas;
