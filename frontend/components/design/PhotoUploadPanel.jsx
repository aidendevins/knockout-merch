import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Heart, 
  Plus,
  Loader2,
  AlertCircle,
  Info,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function PhotoUploadPanel({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 9,
  isUploading = false,
  selectedTemplate = null,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState(null);
  const skipModalRef = useRef(false);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const processFiles = useCallback(async (files) => {
    setUploadError(null);
    
    // Handle both FileList and Array
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setUploadError('Please upload only image files');
        return false;
      }
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Images must be under 10MB');
        return false;
      }
      return true;
    });

    // Check if we'd exceed max photos
    const remainingSlots = maxPhotos - photos.length;
    if (validFiles.length > remainingSlots) {
      setUploadError(`You can only add ${remainingSlots} more photo${remainingSlots !== 1 ? 's' : ''}`);
      validFiles.splice(remainingSlots);
    }

    if (validFiles.length === 0) return;

    // Create preview URLs and add to photos
    const newPhotos = await Promise.all(
      validFiles.map(async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              file,
              preview: e.target.result,
              name: file.name,
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    onPhotosChange([...photos, ...newPhotos]);
  }, [photos, maxPhotos, onPhotosChange]);


  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      e.target.value = '';
      skipModalRef.current = false;
      return;
    }

    // If skipModalRef is true, process files directly (user clicked "Continue Upload")
    if (skipModalRef.current) {
      skipModalRef.current = false;
      processFiles(files);
      e.target.value = '';
      return;
    }

    // Otherwise, show modal first
    setPendingFiles(Array.from(files));
    setShowUploadModal(true);
    e.target.value = '';
  }, [processFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    // Always show modal before processing files
    setPendingFiles(Array.from(files));
    setShowUploadModal(true);
  }, []);

  const handleModalClose = () => {
    setShowUploadModal(false);
    setPendingFiles(null);
    skipModalRef.current = false;
  };

  const handleModalContinue = () => {
    // Process pending files if any
    if (pendingFiles && pendingFiles.length > 0) {
      setShowUploadModal(false);
      processFiles(pendingFiles);
      setPendingFiles(null);
    } else {
      // Set flag to skip modal BEFORE closing modal
      skipModalRef.current = true;
      setShowUploadModal(false);
      
      // Re-trigger file input after modal closes
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          } else {
            // If input not found, reset the flag
            skipModalRef.current = false;
          }
        }, 50);
      });
    }
  };

  const handleRemovePhoto = useCallback((photoId) => {
    onPhotosChange(photos.filter(p => p.id !== photoId));
    setUploadError(null);
  }, [photos, onPhotosChange]);

  const handleDropZoneClick = useCallback((e) => {
    // Don't handle if clicking directly on the file input
    if (e.target.tagName === 'INPUT') {
      return;
    }
    
    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots === 0 || isUploading) return;
    
    // Reset the flag if it was set (from previous "Continue Upload")
    skipModalRef.current = false;
    
    // Always show modal first
    e.preventDefault();
    e.stopPropagation();
    setShowUploadModal(true);
  }, [isUploading, maxPhotos, photos.length]);

  const remainingSlots = maxPhotos - photos.length;

  return (
    <>
      {/* Upload Modal */}
      <Dialog 
        open={showUploadModal} 
        onOpenChange={(open) => {
          if (!open) {
            // User closed modal (ESC, click outside, etc.) - treat like "Go Back"
            handleModalClose();
          }
        }}
      >
        <DialogContent className="max-w-lg bg-gradient-to-br from-gray-900 via-red-950/30 to-gray-900 border-pink-900/30">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-600 to-red-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-white text-xl">Photo Upload Tips</DialogTitle>
            </div>
            <DialogDescription className="text-white/60">
              Get the best results from our AI designer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Image Quality Tips - Template-specific or default */}
            <div className="bg-pink-600/10 border border-pink-900/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="text-white font-medium text-sm">
                    {selectedTemplate?.uploadTips?.title || 'Best Image Quality'}
                  </h4>
                  <ul className="text-white/70 text-sm space-y-1.5 list-disc list-inside">
                    {(selectedTemplate?.uploadTips?.tips || [
                      'Use photos with a <strong>clear subject</strong> (person, pet, object)',
                      'Choose images with a <strong>simple or transparent background</strong>',
                      'Higher resolution photos work better (but max 10MB per file)',
                      'Well-lit photos produce the best designs',
                    ]).map((tip, index) => (
                      <li key={index} dangerouslySetInnerHTML={{ __html: tip }} />
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Privacy Disclaimer */}
            <div className="bg-black/40 border border-pink-900/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="text-white font-medium text-sm">Privacy & Security</h4>
                  <p className="text-white/70 text-sm leading-relaxed">
                    <strong>We don't store your images.</strong> Your photos are processed locally in your browser 
                    and only sent to our AI service temporarily to generate your design. Once your design is created, 
                    the original photos are not saved on our servers.
                  </p>
                  <p className="text-white/70 text-sm leading-relaxed mt-2">
                    <strong>Content Policy:</strong> Please do not upload any nude, explicit, or inappropriate images 
                    that would not be accepted by common AI image generation models. Such content will be rejected by 
                    our AI service and may result in your account being restricted.
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Tips */}
            <div className="text-white/60 text-xs space-y-1">
              <p className="flex items-center gap-2">
                <Heart className="w-3 h-3 text-pink-500" />
                <span>You can upload up to {maxPhotos} photos per design</span>
              </p>
              <p className="flex items-center gap-2">
                <Heart className="w-3 h-3 text-pink-500" />
                <span>Supported formats: PNG, JPG, JPEG</span>
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="ghost"
              onClick={handleModalClose}
              className="text-white/60 hover:text-white hover:bg-pink-600/10"
            >
              Go Back
            </Button>
            <Button
              onClick={handleModalContinue}
              className="bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-medium"
            >
              Continue Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="h-full flex flex-col bg-gradient-to-b from-red-950/30 to-black border-l border-pink-900/30">
      {/* Header */}
      <div className="p-4 border-b border-pink-900/30">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-pink-500" />
          <h3 className="font-bold text-white">Your Photos</h3>
        </div>
        <p className="text-xs text-white/60">
          Upload photos for your design ({photos.length}/{maxPhotos})
        </p>
      </div>

      <ScrollArea className="flex-1 p-3">
        {/* Error message */}
        <AnimatePresence>
          {uploadError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
            >
              <div className="flex items-center gap-2 text-pink-400 text-xs bg-pink-500/10 p-2 rounded-lg border border-pink-900/30">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{uploadError}</span>
                <button 
                  onClick={() => setUploadError(null)}
                  className="ml-auto text-white/60 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleDropZoneClick}
          className={cn(
            "block w-full border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer mb-4",
            isDragOver 
              ? "border-pink-500 bg-pink-500/10" 
              : "border-pink-900/30 hover:border-pink-700/50 hover:bg-pink-600/5"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            onClick={(e) => {
              // Prevent the file input click from bubbling up to the drop zone
              e.stopPropagation();
            }}
            className="hidden"
            disabled={remainingSlots === 0 || isUploading}
            id="photo-upload-input"
          />
          
          <div className="flex flex-col items-center text-center">
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-pink-500 mb-2 animate-spin" />
                <p className="text-white/60 text-sm">Uploading...</p>
              </>
            ) : remainingSlots === 0 ? (
              <>
                <Heart className="w-8 h-8 text-pink-500/50 mb-2" />
                <p className="text-white/60 text-sm">Maximum photos reached</p>
              </>
            ) : (
              <>
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all",
                  isDragOver 
                    ? "bg-pink-500 text-white" 
                    : "bg-pink-600/20 text-pink-400"
                )}>
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-white font-medium text-sm mb-1">
                  {isDragOver ? "Drop photos here!" : "Drop photos here"}
                </p>
                <p className="text-white/50 text-xs">
                  or click to browse
                </p>
                <p className="text-white/40 text-xs mt-2">
                  PNG, JPG up to 10MB
                </p>
              </>
            )}
          </div>
        </div>

        {/* Photo previews grid */}
        {photos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-white/60 mb-2">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} ready
            </p>
            <div className="grid grid-cols-2 gap-2">
              <AnimatePresence>
                {photos.map((photo, index) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative aspect-square rounded-lg overflow-hidden group"
                  >
                    <img 
                      src={photo.preview}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay with number */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Photo number badge */}
                    <div className="absolute top-1 left-1 w-5 h-5 bg-pink-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add more button */}
              {remainingSlots > 0 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-pink-900/30 hover:border-pink-700/50 hover:bg-pink-600/5 flex items-center justify-center cursor-pointer transition-all">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <div className="text-center">
                    <Plus className="w-6 h-6 text-pink-500/60 mx-auto mb-1" />
                    <span className="text-xs text-white/40">Add more</span>
                  </div>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {photos.length === 0 && (
          <div className="text-center py-6 text-white/40">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No photos yet</p>
            <p className="text-xs mt-1">Upload photos to include in your design</p>
          </div>
        )}
      </ScrollArea>
      </div>
    </>
  );
}
