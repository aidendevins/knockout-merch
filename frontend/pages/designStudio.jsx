import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PhotoUploadPanel from '@/components/design/PhotoUploadPanel';
import AIPanel from '@/components/design/AIPanel';
import ProductCanvas from '@/components/design/ProductCanvas';
import TemplatePickerModal from '@/components/design/TemplatePickerModal';
import BackgroundRemovalModal from '@/components/design/BackgroundRemovalModal';
import MockupPreviewModal from '@/components/design/MockupPreviewModal';
import apiClient from '@/api/apiClient';
import { toast } from 'sonner';

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

export default function DesignStudio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  
  // Get template ID from URL if present
  const urlTemplateId = searchParams.get('template');
  
  // Template picker state
  const [showTemplatePicker, setShowTemplatePicker] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // User uploaded photos
  const [uploadedPhotos, setUploadedPhotos] = useState([]);

  // Design state
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [productType, setProductType] = useState('tshirt');
  const [selectedColor, setSelectedColor] = useState('black');
  const [canvasData, setCanvasData] = useState({
    x: 50,
    y: 45,
    scale: 1,
    rotation: 0,
  });
  const [selectedMask, setSelectedMask] = useState('None');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);


  // Background removal state
  const [showBackgroundRemovalModal, setShowBackgroundRemovalModal] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [pendingProductData, setPendingProductData] = useState(null);
  // Cache the original Gemini-generated image (before background removal)
  const [cachedGeminiImage, setCachedGeminiImage] = useState(null);

  // Mockup preview state
  const [showMockupPreview, setShowMockupPreview] = useState(false);
  const [createdProductData, setCreatedProductData] = useState(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Create design mutation
  const createDesignMutation = useMutation({
    mutationFn: async (designData) => {
      return await base44.entities.Design.create(designData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['designs']);
      queryClient.invalidateQueries(['community-designs']);
      queryClient.invalidateQueries(['featured-designs']);
    },
    onError: (err) => {
      toast.error('Failed to save design');
      console.error(err);
    },
  });

  // Handle template picker completion
  const handleTemplatePickerComplete = ({ template, product, color }) => {
    setSelectedTemplate(template);
    setProductType(product.id);
    setSelectedColor(color.id);
    setShowTemplatePicker(false);
    // Clear cached Gemini image when template changes
    setCachedGeminiImage(null);

    toast.success(`${template.name} template selected!`);
  };

  const handleImageGenerated = async (result) => {
    // result can be a URL string (backward compatibility) or an object with url
    const imageUrl = typeof result === 'string' ? result : result.url;

    // Cache the original Gemini-generated image for retry functionality
    setCachedGeminiImage(imageUrl);

    // Check if template requires background removal - do it immediately after generation
    // Support both string ("remove-simple") and boolean (for backwards compatibility)
    const removeBgValue = selectedTemplate?.remove_background || selectedTemplate?.removeBackground;
    const needsBackgroundRemoval = removeBgValue === 'remove-simple' || removeBgValue === true;

    if (needsBackgroundRemoval) {
      // Don't set the image yet - wait for background removal to complete
      console.log('\n' + '='.repeat(80));
      console.log('🎨 BACKGROUND REMOVAL - Triggered after image generation');
      console.log('='.repeat(80));
      console.log('📋 Template ID:', selectedTemplate.id);
      console.log('📋 Template name:', selectedTemplate.name);
      console.log('📋 Image URL:', imageUrl);
      console.log('-'.repeat(80));

      setIsRemovingBackground(true);

      try {
        // Convert image URL to base64 for background removal API
        let imageBase64 = null;
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          imageBase64 = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (fetchErr) {
          console.warn('Failed to convert image to base64:', fetchErr);
        }

        console.log('📡 Calling background removal API...');
        const apiStartTime = Date.now();

        // Call background removal API
        const bgResult = await apiClient.entities.Template.removeBackground(imageBase64 || imageUrl);

        const apiDuration = Date.now() - apiStartTime;
        console.log(`✅ Background removal API call completed in ${apiDuration}ms`);
        console.log('📊 Response stats:');
        console.log('   - Has processedImage:', !!bgResult.processedImage);
        console.log('   - Processed image length:', bgResult.processedImage?.length || 0, 'characters');

        // Store the processed image - it will be used when creating the product
        setProcessedImage(bgResult.processedImage);

        // Convert processed image base64 to a URL for display on canvas
        // Upload the processed image to S3 for display
        try {
          const uploadResult = await base44.uploadBase64(bgResult.processedImage, 'designs');
          // Use proxy URL to avoid CORS issues
          const proxiedUrl = getImageUrl(uploadResult.file_url);
          setGeneratedImage(proxiedUrl || uploadResult.file_url);
          console.log('✅ Background removal successful - processed image uploaded and set');
        } catch (uploadErr) {
          console.error('Failed to upload processed image, using original:', uploadErr);
          // Fall back to original if upload fails - also proxy it
          const proxiedUrl = getImageUrl(imageUrl);
          setGeneratedImage(proxiedUrl || imageUrl);
        }

        console.log('='.repeat(80) + '\n');
      } catch (bgError) {
        console.error('\n' + '='.repeat(80));
        console.error('❌ BACKGROUND REMOVAL - Error after generation');
        console.error('='.repeat(80));
        console.error('📋 Error message:', bgError.message);
        console.error('⚠️  Continuing with original image (background removal failed)');
        console.error('='.repeat(80) + '\n');

        toast.error('Background removal failed. Using original image.');
        // Continue with original image - set it now since background removal failed
        // Use proxy URL to avoid CORS issues
        const proxiedUrl = getImageUrl(imageUrl);
        setGeneratedImage(proxiedUrl || imageUrl);
      } finally {
        setIsRemovingBackground(false);
        setIsGenerating(false); // Stop loading state only after background removal completes
      }
    } else {
      // No background removal needed - set image immediately
      // Use proxy URL to avoid CORS issues
      const proxiedUrl = getImageUrl(imageUrl);
      setGeneratedImage(proxiedUrl || imageUrl);
      setIsGenerating(false); // Stop loading state
    }
  };

  // Retry background removal using cached Gemini image
  const handleRetryBackgroundRemoval = async () => {
    if (!cachedGeminiImage) {
      toast.error('No cached image available');
      return;
    }

    const removeBgValue = selectedTemplate?.remove_background || selectedTemplate?.removeBackground;
    if (!removeBgValue || (removeBgValue !== 'remove-simple' && removeBgValue !== 'remove-complex')) {
      toast.error('Background removal not enabled for this template');
      return;
    }

    setIsRemovingBackground(true);

    try {
      // Convert cached Gemini image URL to base64 for background removal API
      let imageBase64 = null;
      try {
        // Use proxy URL if it's an S3 URL to avoid CORS
        const imageUrlToFetch = cachedGeminiImage.includes('proxy-image')
          ? cachedGeminiImage
          : getImageUrl(cachedGeminiImage) || cachedGeminiImage;

        const response = await fetch(imageUrlToFetch);
        const blob = await response.blob();
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (fetchErr) {
        console.error('Failed to convert cached image to base64:', fetchErr);
        toast.error('Failed to load cached image');
        return;
      }

      // Call background removal API
      const bgResult = await apiClient.entities.Template.removeBackground(imageBase64 || cachedGeminiImage);

      // Store the processed image
      setProcessedImage(bgResult.processedImage);

      // Upload processed image to S3 and update display
      try {
        const uploadResult = await base44.uploadBase64(bgResult.processedImage, 'designs');
        const proxiedUrl = getImageUrl(uploadResult.file_url);
        setGeneratedImage(proxiedUrl || uploadResult.file_url);
        toast.success('Background removed successfully');
      } catch (uploadErr) {
        console.error('Failed to upload processed image:', uploadErr);
        toast.error('Failed to upload processed image');
      }
    } catch (bgError) {
      console.error('Background removal error:', bgError);
      toast.error(bgError.message || 'Failed to remove background');
    } finally {
      setIsRemovingBackground(false);
    }
  };

  const handleBackgroundRemovalChoice = async (choice) => {
    try {
      console.log('\n' + '='.repeat(80));
      console.log('👤 BACKGROUND REMOVAL - User made choice');
      console.log('='.repeat(80));
      console.log('📋 User choice:', choice);
      console.log('📋 Has pendingProductData:', !!pendingProductData);
      console.log('📋 Has processedImage:', !!processedImage);
      console.log('-'.repeat(80));

      const { designImageUrl, designImageBase64 } = pendingProductData;

      // Use the appropriate image based on user choice
      let finalImageUrl = designImageUrl;
      let finalImageBase64 = designImageBase64;

      if (choice === 'transparent' && processedImage) {
        console.log('🔄 User chose transparent background - uploading processed image to S3...');
        const uploadStartTime = Date.now();

        // Upload the processed image to S3
        const uploadResult = await base44.uploadBase64(processedImage, 'designs');

        const uploadDuration = Date.now() - uploadStartTime;
        console.log(`✅ Processed image uploaded to S3 in ${uploadDuration}ms`);
        console.log('📋 S3 URL:', uploadResult.file_url);

        finalImageUrl = uploadResult.file_url;
        finalImageBase64 = processedImage;
        console.log('✅ Using transparent background version');
        toast.success('Using transparent background');
      } else {
        console.log('✅ User chose solid background - using original image');
        toast.success('Using solid background');
      }

      console.log('-'.repeat(80));
      console.log('📤 Proceeding to product creation with chosen image');
      console.log('='.repeat(80) + '\n');

      // Continue with the product creation
      await continueProductCreation(finalImageUrl, finalImageBase64);

      // Close modal
      setShowBackgroundRemovalModal(false);
      setProcessedImage(null);
      setPendingProductData(null);
    } catch (error) {
      console.error('\n' + '='.repeat(80));
      console.error('❌ BACKGROUND REMOVAL - Error handling user choice');
      console.error('='.repeat(80));
      console.error('📋 Error type:', error.constructor.name);
      console.error('📋 Error message:', error.message);
      console.error('📋 Error code:', error.code || 'N/A');
      if (error.stack) {
        console.error('📋 Stack trace:', error.stack);
      }
      console.error('='.repeat(80) + '\n');

      toast.error('Failed to process image');
      setIsCreatingProduct(false);
      setShowBackgroundRemovalModal(false);
    }
  };

  const continueProductCreation = async (designImageUrl, designImageBase64) => {
    try {
      // Step 2: Save the design to the database
      const user = await base44.auth.me();
      const designTitle = `Valentine's Design ${Date.now()}`;
      
      const design = await createDesignMutation.mutateAsync({
        title: designTitle,
        design_image_url: designImageUrl,
        template_id: selectedTemplate?.id,
        product_type: productType,
        color: selectedColor,
        canvas_data: canvasData,
        price: productType === 'hoodie' ? 49.99 : 29.99,
        is_published: false,
        creator_name: user?.full_name || 'Anonymous',
      });

      // Step 3: Create the product on Printify
      toast.info('Creating your product...');
      
      const printifyProduct = await base44.printify.createProduct({
        title: designTitle,
        description: `Custom Valentine's Day design - ${selectedTemplate?.name || 'Custom'} style.`,
        designImageUrl: designImageUrl,
        designImageBase64: designImageBase64,
        productType: productType,
        color: selectedColor,
        canvasData: canvasData,
        designId: design.id,
      });

      // Step 4: Navigate directly to the product page
      // The design is already saved in DB with product_type and color locked in
      toast.success('Product created! Select your size and quantity.');
      navigate(`/product/${design.id}`);

    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Handle user accepting the product - navigate to checkout
  const handleAcceptProduct = () => {
    if (!createdProductData) return;

    // Encode the data for URL passing
    const encodedData = encodeURIComponent(JSON.stringify(createdProductData));

    setShowMockupPreview(false);
    navigate(createPageUrl(`ProductPreview?data=${encodedData}`));
  };

  // Handle user declining the product - delete from Printify and stay on canvas
  const handleDeclineProduct = async () => {
    if (!createdProductData?.printifyProductId) {
      setShowMockupPreview(false);
      setCreatedProductData(null);
      return;
    }

    setIsDeletingProduct(true);

    try {
      // Delete the product from Printify (and optionally the design from DB)
      await apiClient.printify.deleteProduct(
        createdProductData.printifyProductId,
        true // Also delete the design from database
      );

      toast.success('Product removed. You can continue editing your design.');
      setShowMockupPreview(false);
      setCreatedProductData(null);
      // Design state (generatedImage, canvasData) is preserved - user can continue editing
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to remove product, but you can continue editing.');
      setShowMockupPreview(false);
      setCreatedProductData(null);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!generatedImage) {
      toast.error('Please generate a design first');
      return;
    }

    setIsCreatingProduct(true);

    try {
      // Step 1: Export the canvas design if canvas ref is available
      let designImageUrl = generatedImage;
      let designImageBase64 = null;

      if (canvasRef.current?.exportDesign) {
        try {
          const exportData = await canvasRef.current.exportDesign();
          // Use the base64 directly for Printify (more reliable than URL)
          designImageBase64 = exportData.base64;

          // Also upload to S3 for database storage and display
          const uploadResult = await base44.uploadBase64(exportData.base64, 'designs');
          designImageUrl = uploadResult.file_url;
          toast.success('Design exported successfully');
        } catch (exportErr) {
          console.warn('Canvas export failed, using original image:', exportErr);
          // Continue with the original generated image
          // Try to convert the original image URL to base64 for Printify
          try {
            const response = await fetch(generatedImage);
            const blob = await response.blob();
            const reader = new FileReader();
            designImageBase64 = await new Promise((resolve, reject) => {
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (fetchErr) {
            console.warn('Failed to convert image to base64:', fetchErr);
          }
        }
      } else {
        // No canvas export available, try to convert the generated image URL to base64
        try {
          const response = await fetch(generatedImage);
          const blob = await response.blob();
          const reader = new FileReader();
          designImageBase64 = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (fetchErr) {
          console.warn('Failed to convert image to base64:', fetchErr);
        }
      }

      // Background removal now happens after image generation, not here
      // If processedImage exists (from background removal after generation), use it
      // Otherwise use the original design image

      // If we have a processed image from background removal, use it instead
      const removeBgValue = selectedTemplate?.remove_background || selectedTemplate?.removeBackground;
      const hasBackgroundRemoval = removeBgValue === 'remove-simple' || removeBgValue === true;
      if (processedImage && hasBackgroundRemoval) {
        console.log('🔄 Using processed image from background removal...');
        // Convert processedImage (base64) to a usable format
        // Upload processed image to S3 and use that URL
        try {
          const uploadResult = await base44.uploadBase64(processedImage, 'designs');
          designImageUrl = uploadResult.file_url;
          // Use the base64 directly for Printify
          designImageBase64 = processedImage;
          console.log('✅ Processed image uploaded to S3:', designImageUrl);
        } catch (uploadErr) {
          console.error('Failed to upload processed image, using original:', uploadErr);
          // Fall back to original image if upload fails
        }
      }

      // Continue with product creation (using processed image if available, otherwise original)
      await continueProductCreation(designImageUrl, designImageBase64);

    } catch (error) {
      console.error('Error in product creation flow:', error);
      toast.error(error.message || 'Failed to create product');
      setIsCreatingProduct(false);
      setShowBackgroundRemovalModal(false);
    }
  };

  // Get photo URLs for AI generation
  const getPhotoUrls = () => {
    return uploadedPhotos.map(p => p.preview);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-black via-red-950/20 to-black pt-16 flex">
      {/* Template Picker Modal */}
      <TemplatePickerModal
        isOpen={showTemplatePicker}
        onClose={() => {
          // Don't allow closing without selecting - or navigate back
          if (!selectedTemplate) {
            navigate('/');
          } else {
            setShowTemplatePicker(false);
          }
        }}
        onComplete={handleTemplatePickerComplete}
        initialTemplateId={urlTemplateId}
      />

      {/* AI Panel */}
      <div className="w-72 flex-shrink-0 hidden md:block">
        <AIPanel 
          uploadedPhotos={uploadedPhotos}
          selectedTemplate={selectedTemplate}
          onImageGenerated={handleImageGenerated}
          generatedImage={generatedImage}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          isRemovingBackground={isRemovingBackground}
          cachedGeminiImage={cachedGeminiImage}
          onRetryBackgroundRemoval={handleRetryBackgroundRemoval}
          selectedColor={selectedColor}
        />
      </div>

      {/* Main canvas area */}
      <div className="flex-1 flex flex-col">
        <ProductCanvas 
          ref={canvasRef}
          generatedImage={generatedImage}
          onSave={handleCreateProduct}
          isSaving={isCreatingProduct}
          productType={productType}
          setProductType={setProductType}
          canvasData={canvasData}
          setCanvasData={setCanvasData}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          selectedMask={selectedMask}
          setSelectedMask={setSelectedMask}
        />
      </div>

      {/* Right sidebar - Photo Upload */}
      <div className="w-64 flex-shrink-0 hidden lg:block">
        <PhotoUploadPanel
          photos={uploadedPhotos}
          onPhotosChange={setUploadedPhotos}
          maxPhotos={selectedTemplate?.maxPhotos || 9}
          selectedTemplate={selectedTemplate}
        />
      </div>

      {/* Background Removal Modal */}
      <BackgroundRemovalModal
        isOpen={showBackgroundRemovalModal}
        onClose={() => {
          setShowBackgroundRemovalModal(false);
          setIsCreatingProduct(false);
          setPendingProductData(null);
          setProcessedImage(null);
        }}
        originalImage={pendingProductData?.designImageUrl || generatedImage}
        processedImage={processedImage}
        isProcessing={isRemovingBackground}
        onChoose={handleBackgroundRemovalChoice}
      />

      {/* Mobile panels - shown on smaller screens */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-gradient-to-br from-red-950/30 to-black border-t border-pink-900/30 p-4">
        <p className="text-center text-white/70 text-sm">
          For the best experience, please use a larger screen
        </p>
      </div>

      {/* Mockup Preview Modal */}
      <MockupPreviewModal
        isOpen={showMockupPreview}
        onClose={() => {
          setShowMockupPreview(false);
          // Keep createdProductData so user can re-open if needed
        }}
        mockupUrls={createdProductData?.mockupUrls || []}
        productData={createdProductData}
        isLoading={isCreatingProduct}
        onAccept={handleAcceptProduct}
        onDecline={handleDeclineProduct}
        isDeleting={isDeletingProduct}
      />
    </div>
  );
}
