import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Palette, Sparkles, ArrowRight, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/api/apiClient';

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

export default function StudioCarousel({ designs }) {
  const navigate = useNavigate();
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [templateDetails, setTemplateDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedMockupIndex, setSelectedMockupIndex] = useState(0);

  // Reset mockup index when selecting a new design
  useEffect(() => {
    setSelectedMockupIndex(0);
  }, [selectedDesign?.id]);

  // Fetch full template details when a design is selected
  useEffect(() => {
    if (selectedDesign?.template_id) {
      setLoadingDetails(true);
      apiClient.entities.Template.get(selectedDesign.template_id)
        .then(template => {
          setTemplateDetails(template);
        })
        .catch(err => {
          console.error('Failed to fetch template details:', err);
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    } else {
      setTemplateDetails(null);
    }
  }, [selectedDesign?.template_id]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setSelectedDesign(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  if (!designs?.length) return null;

  // Get customization info from template
  const getCustomizationInfo = (template) => {
    if (!template?.panel_schema?.fields) return [];
    return template.panel_schema.fields.map(field => ({
      label: field.label,
      type: field.type,
      required: field.required,
    }));
  };

  // Get available colors based on text_behavior
  const getAvailableColors = (template) => {
    const textBehavior = template?.text_behavior;
    
    const allColors = [
      { id: 'black', name: 'Black', hex: '#1a1a1a' },
      { id: 'white', name: 'White', hex: '#f5f5f5' },
      { id: 'pink', name: 'Pink', hex: '#e2b8c9' },
    ];
    
    if (textBehavior === 'static-dark') {
      // Dark text blocks black fabric - allow white + pink
      return allColors.filter(c => c.id !== 'black');
    } else if (textBehavior === 'static-light') {
      // Light text blocks white fabric - allow black + pink
      return allColors.filter(c => c.id !== 'white');
    }
    // 'none' or 'user-controlled' - all colors available
    return allColors;
  };

  return (
    <section id="templates-section" className="py-24 overflow-hidden relative w-full">
      <div className="max-w-[2400px] mx-auto px-4 md:px-8 lg:px-16 xl:px-24 2xl:px-32 relative z-10">
        {/* Section header */}
        <div className="text-center mb-12">
          <Badge className="bg-gradient-to-r from-pink-600 to-red-600 text-white border-0 mb-4 text-sm px-4 py-1.5 shadow-lg shadow-pink-600/30">
            Studio Templates
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Available Now
          </h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Browse our curated collection of designs. Click to see details and customize.
          </p>
        </div>

        {/* Responsive grid - up to 4 columns on ultrawide */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {designs.map((design, index) => (
            <motion.div
              key={design.id}
              layoutId={`card-${design.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              onClick={() => setSelectedDesign(design)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer"
            >
              <div className="group relative bg-gradient-to-b from-gray-800/50 via-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-pink-900/30 hover:border-pink-600/50 transition-all duration-500 shadow-2xl hover:shadow-pink-600/20 h-full flex flex-col">
                {/* Template reference image */}
                <motion.div 
                  layoutId={`card-image-${design.id}`}
                  className="aspect-[3/4] flex-shrink-0 bg-gradient-to-br from-gray-800/30 via-red-950/20 to-black/30 p-8 flex items-center justify-center relative overflow-hidden"
                >
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {design.reference_image ? (
                    <img 
                      src={getImageUrl(design.reference_image)} 
                      alt={design.title}
                      className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                      draggable="false"
                    />
                  ) : design.mockup_urls?.[0] ? (
                    <img 
                      src={getImageUrl(design.mockup_urls[0])} 
                      alt={design.title}
                      className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                      draggable="false"
                    />
                  ) : design.design_image_url ? (
                    <div className="relative z-10 w-48 h-60 bg-white/5 backdrop-blur-sm rounded-lg shadow-2xl flex items-center justify-center overflow-hidden">
                      <img 
                        src={design.design_image_url} 
                        alt={design.title}
                        className="w-32 h-32 object-contain"
                        draggable="false"
                      />
                    </div>
                  ) : (
                    <div className="relative z-10 w-48 h-60 bg-white/5 backdrop-blur-sm rounded-lg shadow-2xl flex items-center justify-center">
                      <span className="text-gray-500">No preview</span>
                    </div>
                  )}
                </motion.div>
                
                {/* Info panel - fixed height for consistency */}
                <div className="relative p-6 bg-gradient-to-b from-black/40 to-black/60 backdrop-blur-sm border-t border-pink-900/30 flex-shrink-0 flex flex-col" style={{ minHeight: '140px' }}>
                  <motion.h3 
                    layoutId={`card-title-${design.id}`}
                    className="text-white font-bold text-xl mb-3 group-hover:text-pink-300 transition-colors line-clamp-2" 
                    style={{ minHeight: '3rem' }}
                  >
                    {design.title}
                  </motion.h3>
                  <div className="flex items-center justify-between mt-auto">
                    <div>
                      <span className="text-xl font-bold text-pink-400">
                        From $29.99
                      </span>
                      {design.sales_count > 0 && (
                        <p className="text-pink-300/60 text-sm mt-1">
                          {design.sales_count} sold
                        </p>
                      )}
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-pink-600/20 border border-pink-600/30 text-pink-300 text-sm font-medium">
                      View Details
                    </div>
                  </div>
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-pink-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal Overlay */}
      <AnimatePresence>
        {selectedDesign && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDesign(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            
            {/* Modal Container */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                layoutId={`card-${selectedDesign.id}`}
                className="w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto"
              >
                <div className="relative bg-gradient-to-b from-gray-900/95 via-gray-900/98 to-black/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-pink-600/30 shadow-2xl shadow-pink-600/20">
                  {/* Close button */}
                  <button
                    onClick={() => setSelectedDesign(null)}
                    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col md:flex-row max-h-[90vh] overflow-y-auto">
                    {/* Left side - Reference Image & Mockups */}
                    <motion.div 
                      layoutId={`card-image-${selectedDesign.id}`}
                      className="md:w-1/2 bg-gradient-to-br from-gray-800/30 via-red-950/20 to-black/30 p-6 flex flex-col"
                    >
                      {/* Main image - shows selected mockup or reference image */}
                      <div className="aspect-[3/4] flex items-center justify-center relative overflow-hidden rounded-xl">
                        {selectedDesign.mockup_urls?.length > 0 ? (
                          <img 
                            src={getImageUrl(selectedDesign.mockup_urls[selectedMockupIndex] || selectedDesign.mockup_urls[0])} 
                            alt={selectedDesign.title}
                            className="w-full h-full object-contain"
                            draggable="false"
                          />
                        ) : selectedDesign.reference_image ? (
                          <img 
                            src={getImageUrl(selectedDesign.reference_image)} 
                            alt={selectedDesign.title}
                            className="w-full h-full object-contain"
                            draggable="false"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/5 rounded-lg flex items-center justify-center">
                            <span className="text-gray-500">No preview</span>
                          </div>
                        )}
                      </div>

                      {/* Thumbnail gallery - show mockups if available */}
                      {selectedDesign.mockup_urls?.length > 1 && (
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                          {selectedDesign.mockup_urls.slice(0, 6).map((url, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.1 }}
                              onClick={() => setSelectedMockupIndex(idx)}
                              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                selectedMockupIndex === idx 
                                  ? 'border-pink-500 ring-2 ring-pink-500/30' 
                                  : 'border-pink-900/30 hover:border-pink-600/50'
                              }`}
                            >
                              <img 
                                src={getImageUrl(url)} 
                                alt={`${selectedDesign.title} mockup ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>

                    {/* Right side - Details */}
                    <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
                      <motion.h2 
                        layoutId={`card-title-${selectedDesign.id}`}
                        className="text-2xl md:text-3xl font-bold text-white mb-2"
                      >
                        {selectedDesign.title}
                      </motion.h2>

                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl font-bold text-pink-400">
                          From $29.99
                        </span>
                        <Badge className="bg-pink-600/20 text-pink-300 border-pink-600/30">
                          Template
                        </Badge>
                      </div>

                      {/* Description */}
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-white/70 mb-6 leading-relaxed"
                      >
                        {selectedDesign.description || templateDetails?.description || 'A beautifully crafted template ready for your personalization. Upload your photos and customize to make it uniquely yours.'}
                      </motion.p>

                      {/* Template Details */}
                      <div className="space-y-4 mb-6">
                        <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
                          Template Details
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {/* Photos required */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="p-3 rounded-lg bg-white/5 border border-white/10"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Camera className="w-4 h-4 text-pink-400" />
                              <span className="text-xs text-white/50 uppercase">Photos</span>
                            </div>
                            <div className="text-lg font-semibold text-white">
                              {loadingDetails ? '...' : (templateDetails?.max_photos || 1)} {(templateDetails?.max_photos || 1) === 1 ? 'photo' : 'photos'}
                            </div>
                          </motion.div>

                          {/* Customization options count */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-3 rounded-lg bg-white/5 border border-white/10"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Palette className="w-4 h-4 text-pink-400" />
                              <span className="text-xs text-white/50 uppercase">Customize</span>
                            </div>
                            <div className="text-lg font-semibold text-white">
                              {loadingDetails ? '...' : (getCustomizationInfo(templateDetails).length || 0)} options
                            </div>
                          </motion.div>

                          {/* Available Colors */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="p-3 rounded-lg bg-white/5 border border-white/10"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Shirt className="w-4 h-4 text-pink-400" />
                              <span className="text-xs text-white/50 uppercase">Colors</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {loadingDetails ? (
                                <span className="text-lg font-semibold text-white">...</span>
                              ) : (
                                getAvailableColors(templateDetails).map((color) => (
                                  <div
                                    key={color.id}
                                    title={color.name}
                                    className="w-5 h-5 rounded-full border border-white/20"
                                    style={{ backgroundColor: color.hex }}
                                  />
                                ))
                              )}
                            </div>
                          </motion.div>

                          {/* AI-powered */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="p-3 rounded-lg bg-white/5 border border-white/10"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Sparkles className="w-4 h-4 text-pink-400" />
                              <span className="text-xs text-white/50 uppercase">Powered by</span>
                            </div>
                            <div className="text-lg font-semibold text-white">
                              AI Design
                            </div>
                          </motion.div>
                        </div>
                      </div>

                      {/* Customization fields preview */}
                      {templateDetails?.panel_schema?.fields?.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.35 }}
                          className="mb-6"
                        >
                          <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
                            What You Can Customize
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {templateDetails.panel_schema.fields.map((field, idx) => (
                              <span 
                                key={idx}
                                className="px-3 py-1.5 rounded-full bg-pink-600/10 border border-pink-600/20 text-pink-300 text-sm"
                              >
                                {field.label}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* CTA Buttons */}
                      <div className="mt-auto pt-4 border-t border-white/10 space-y-3">
                        <Button
                          onClick={() => {
                            setSelectedDesign(null);
                            // Navigate to design studio with the template pre-selected
                            navigate(`/design?template=${selectedDesign.template_id}`);
                          }}
                          className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-semibold py-6 text-lg shadow-lg hover:shadow-pink-600/50 transition-all"
                        >
                          Customize This Design
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                        <p className="text-center text-white/40 text-sm">
                          Upload your photos and personalize this template
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
