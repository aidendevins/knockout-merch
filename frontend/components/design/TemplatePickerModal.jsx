import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ChevronRight, ChevronLeft, Check, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { fetchTemplates, PRODUCT_TYPES, COLOR_OPTIONS } from '@/config/templates';

// Helper to get image URL (use proxy if needed for CORS)
const getImageUrl = (url) => {
  if (!url) return null;
  
  // Always use proxy for S3 URLs to avoid CORS issues
  if (url.includes('s3.amazonaws.com') || url.includes('s3://') || url.includes('.s3.')) {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const apiBase = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
    
    // Try to extract S3 key from URL for more reliable proxying
    let proxyUrl;
    try {
      // Extract key from URL like: https://bucket.s3.region.amazonaws.com/key
      const urlMatch = url.match(/\.s3\.[^/]+\/(.+)$/);
      if (urlMatch && urlMatch[1]) {
        const key = decodeURIComponent(urlMatch[1]);
        proxyUrl = `${apiBase}/upload/proxy-image?key=${encodeURIComponent(key)}`;
      } else {
        // Fallback to URL parameter
        proxyUrl = `${apiBase}/upload/proxy-image?url=${encodeURIComponent(url)}`;
      }
    } catch (e) {
      // Fallback to URL parameter if key extraction fails
      proxyUrl = `${apiBase}/upload/proxy-image?url=${encodeURIComponent(url)}`;
    }
    
    return proxyUrl;
  }
  return url;
};

const STEPS = [
  { id: 'template', title: 'Choose Your Style', subtitle: 'Pick a design template' },
  { id: 'product', title: 'Select Product', subtitle: 'T-shirt or hoodie?' },
  { id: 'color', title: 'Pick a Color', subtitle: 'Choose your fabric color' },
];

export default function TemplatePickerModal({ 
  isOpen, 
  onClose, 
  onComplete,
  initialTemplateId = null, // Template ID from URL
  initialTemplate = null,   // Direct template object (legacy support)
  initialProduct = null,
  initialColor = null,
  resetToFirstStep = false, // Force reset to step 1 (template selection)
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for back
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplate);
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Reset to first step when resetToFirstStep changes to true
  useEffect(() => {
    if (resetToFirstStep && isOpen) {
      setCurrentStep(0);
      setSelectedTemplate(null);
      setSelectedProduct(null);
      setSelectedColor(null);
      setHasInitialized(false);
    }
  }, [resetToFirstStep, isOpen]);

  // Fetch templates from API (excluding hidden templates)
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => fetchTemplates(false), // Explicitly pass false to exclude hidden templates
    staleTime: 0, // Don't cache - always fetch fresh data
  });

  // When templates load and we have an initialTemplateId, find and select that template
  // Then skip to step 2 (product selection)
  useEffect(() => {
    if (!hasInitialized && templates.length > 0) {
      const templateIdToFind = initialTemplateId || initialTemplate?.id;
      if (templateIdToFind) {
        const foundTemplate = templates.find(t => t.id === templateIdToFind);
        if (foundTemplate) {
          setSelectedTemplate(foundTemplate);
          setCurrentStep(1); // Skip to step 2 (product selection)
          setHasInitialized(true);
        }
      }
    }
  }, [initialTemplateId, initialTemplate, templates, hasInitialized]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete the flow
      console.log('🎯 TemplatePickerModal onComplete - Template data:', {
        id: selectedTemplate?.id,
        name: selectedTemplate?.name,
        has_canvas_config: !!selectedTemplate?.canvas_config,
        canvas_config: selectedTemplate?.canvas_config,
        all_template_keys: Object.keys(selectedTemplate || {})
      });
      
      onComplete({
        template: selectedTemplate,
        product: selectedProduct,
        color: selectedColor,
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!selectedTemplate;
      case 1: return !!selectedProduct;
      case 2: return !!selectedColor;
      default: return false;
    }
  };

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        if (templatesLoading) {
          return (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            </div>
          );
        }
        
        if (templates.length === 0) {
          return (
            <div className="text-center py-12 text-white/60">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No templates available</p>
              <p className="text-sm mt-1">Please contact admin</p>
            </div>
          );
        }
        
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {templates.map((template) => (
              <motion.button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all text-left overflow-hidden group",
                  selectedTemplate?.id === template.id
                    ? "border-pink-500 bg-pink-500/10"
                    : "border-pink-900/30 bg-black/40 hover:border-pink-700/50"
                )}
              >
                {/* Background gradient */}
                <div className={cn(
                  "absolute inset-0 opacity-20 bg-gradient-to-br",
                  template.gradient
                )} />
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Cover image (example_image) or fallback to reference image */}
                  {template.example_image || template.exampleImage || template.referenceImage || template.reference_image ? (
                    <div className="w-full aspect-[3/4] rounded-md sm:rounded-lg mb-2 sm:mb-3 bg-black overflow-hidden border border-pink-900/30">
                      <img 
                        src={getImageUrl(template.example_image || template.exampleImage || template.referenceImage || template.reference_image) || (template.example_image || template.exampleImage || template.referenceImage || template.reference_image)}
                        alt={template.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to gradient placeholder if image fails to load
                          e.target.style.display = 'none';
                          const placeholder = e.target.parentElement.querySelector('.fallback-placeholder');
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                      {/* Fallback placeholder */}
                      <div className={cn(
                        "w-full h-full bg-gradient-to-br hidden items-center justify-center fallback-placeholder",
                        template.gradient
                      )}>
                        <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-white/80" />
                      </div>
                    </div>
                  ) : (
                    <div className={cn(
                      "w-full aspect-[3/4] rounded-md sm:rounded-lg mb-2 sm:mb-3 bg-gradient-to-br flex items-center justify-center",
                      template.gradient
                    )}>
                      <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-white/80" />
                    </div>
                  )}
                  
                  <h4 className="font-bold text-white text-sm sm:text-base lg:text-lg">{template.name}</h4>
                  <p className="text-white/60 text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-2">{template.description}</p>
                  
                  {/* Max photos info */}
                  <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white/50">
                    <span>Up to {template.maxPhotos} photos</span>
                    {template.supportsText && (
                      <>
                        <span>•</span>
                        <span className="hidden xs:inline">Custom text</span>
                        <span className="xs:hidden">Text</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Selected indicator */}
                {selectedTemplate?.id === template.id && (
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-pink-600 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        );
      
      case 1:
        return (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 max-w-md mx-auto">
            {PRODUCT_TYPES.map((product) => (
              <motion.button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative p-4 sm:p-6 rounded-lg sm:rounded-xl border-2 transition-all flex flex-col items-center",
                  selectedProduct?.id === product.id
                    ? "border-pink-500 bg-pink-500/10"
                    : "border-pink-900/30 bg-black/40 hover:border-pink-700/50"
                )}
              >
                <span className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-3">{product.icon}</span>
                <h4 className="font-bold text-white text-base sm:text-lg">{product.name}</h4>
                <p className="text-pink-400 text-xs sm:text-sm mt-0.5 sm:mt-1">${product.basePrice}</p>
                
                {selectedProduct?.id === product.id && (
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-pink-600 to-red-600 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        );
      
      case 2:
        // Filter color options based on template text_behavior
        let availableColors = COLOR_OPTIONS;
        
        if (selectedTemplate?.text_behavior === 'static-dark') {
          // Text is dark (black) - black text invisible on black fabric
          // Exclude BLACK fabric only, allow white and light pink
          availableColors = COLOR_OPTIONS.filter(color => 
            color.id !== 'black'
          );
        } else if (selectedTemplate?.text_behavior === 'static-light') {
          // Text is light (white/cream) - light text invisible on white fabric
          // Exclude WHITE fabric only, allow black and light pink
          availableColors = COLOR_OPTIONS.filter(color => 
            color.id !== 'white'
          );
        }
        // If text_behavior is 'user-controlled' or 'none', show all colors
        // Light pink is NEVER blocked - it works with both light and dark text
        
        return (
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6">
            {availableColors.map((color) => (
              <motion.button
                key={color.id}
                onClick={() => setSelectedColor(color)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all flex flex-col items-center w-24 sm:w-28 md:w-32",
                  selectedColor?.id === color.id
                    ? "border-pink-500 bg-pink-500/10"
                    : "border-pink-900/30 bg-black/40 hover:border-pink-700/50"
                )}
              >
                {/* Color preview */}
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full mb-2 sm:mb-3 border-3 sm:border-4 border-white/20 shadow-lg"
                  style={{ backgroundColor: color.hex }}
                />
                <h4 className="font-bold text-white text-xs sm:text-sm">{color.name}</h4>
                
                {selectedColor?.id === color.id && (
                  <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-r from-pink-600 to-red-600 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[95vh] bg-gradient-to-br from-gray-900 via-red-950/30 to-gray-900 border-pink-900/30 p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-2 sm:p-3 md:p-4 lg:p-6 border-b border-pink-900/30 flex-shrink-0">
          <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />
            <h2 className="font-bold text-white text-sm sm:text-base md:text-lg lg:text-xl">
              {STEPS[currentStep].title}
            </h2>
          </div>
          <p className="text-white/60 text-xs sm:text-sm">{STEPS[currentStep].subtitle}</p>
          
          {/* Step indicators */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 md:mt-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  "w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all",
                  index < currentStep 
                    ? "bg-gradient-to-r from-pink-600 to-red-600 text-white"
                    : index === currentStep
                      ? "bg-pink-600 text-white"
                      : "bg-black/40 text-white/40 border border-pink-900/30"
                )}>
                  {index < currentStep ? (
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "w-3 sm:w-4 md:w-8 h-0.5 mx-0.5 sm:mx-1",
                    index < currentStep ? "bg-pink-600" : "bg-pink-900/30"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content area with slide animation and scroll */}
        <div className="overflow-y-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="p-2 sm:p-3 md:p-4 lg:p-6"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer with navigation */}
        <div className="p-2 sm:p-3 md:p-4 lg:p-6 border-t border-pink-900/30 flex justify-between items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="text-white/60 hover:text-white hover:bg-pink-600/10 disabled:opacity-0 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-9"
          >
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
            <span className="hidden xs:inline">Back</span>
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-bold px-3 sm:px-6 disabled:opacity-50 text-xs sm:text-sm h-8 sm:h-9"
          >
            {currentStep === STEPS.length - 1 ? (
              <>
                <span className="hidden xs:inline">Start Designing</span>
                <span className="xs:hidden">Start</span>
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5 sm:ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
