import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PhotoUploadPanel from '@/components/design/PhotoUploadPanel';
import AIPanel from '@/components/design/AIPanel';
import ProductCanvas from '@/components/design/ProductCanvas';
import TemplatePickerModal from '@/components/design/TemplatePickerModal';
import BackgroundRemovalModal from '@/components/design/BackgroundRemovalModal';
import apiClient from '@/api/apiClient';
import { toast } from 'sonner';

export default function DesignStudio() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);

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
    
    toast.success(`${template.name} template selected!`);
  };

  const handleImageGenerated = (result) => {
    // result can be a URL string (backward compatibility) or an object with url
    if (typeof result === 'string') {
      setGeneratedImage(result);
    } else {
      setGeneratedImage(result.url);
    }
  };

  const handleBackgroundRemovalChoice = async (choice) => {
    try {
      const { designImageUrl, designImageBase64 } = pendingProductData;
      
      // Use the appropriate image based on user choice
      let finalImageUrl = designImageUrl;
      let finalImageBase64 = designImageBase64;
      
      if (choice === 'transparent' && processedImage) {
        // Upload the processed image to S3
        const uploadResult = await base44.uploadBase64(processedImage, 'designs');
        finalImageUrl = uploadResult.file_url;
        finalImageBase64 = processedImage;
        toast.success('Using transparent background');
      } else {
        toast.success('Using solid background');
      }

      // Continue with the product creation
      await continueProductCreation(finalImageUrl, finalImageBase64);
      
      // Close modal
      setShowBackgroundRemovalModal(false);
      setProcessedImage(null);
      setPendingProductData(null);
    } catch (error) {
      console.error('Error handling background choice:', error);
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

      // Step 4: Navigate to the product preview page with all data
      const productData = {
        designId: design.id,
        printifyProductId: printifyProduct.id,
        mockupUrls: printifyProduct.mockup_urls || [],
        title: designTitle,
        productType: productType,
        color: selectedColor,
        price: productType === 'hoodie' ? 49.99 : 29.99,
        designImageUrl: designImageUrl,
      };

      // Encode the data for URL passing
      const encodedData = encodeURIComponent(JSON.stringify(productData));

      toast.success('Product created! Select your size and quantity.');
      navigate(createPageUrl(`ProductPreview?data=${encodedData}`));

    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product');
    } finally {
      setIsCreatingProduct(false);
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

      // Check if template requires background removal
      if (selectedTemplate?.remove_background || selectedTemplate?.removeBackground) {
        console.log('🎨 Template requires background removal');
        
        // Store the data for later use
        setPendingProductData({ designImageUrl, designImageBase64 });
        
        // Show modal and start background removal
        setShowBackgroundRemovalModal(true);
        setIsRemovingBackground(true);
        
        try {
          // Call background removal API
          const result = await apiClient.entities.Template.removeBackground(designImageBase64 || designImageUrl);
          setProcessedImage(result.processedImage);
          setIsRemovingBackground(false);
          
          // Modal stays open, waiting for user choice
          // User will choose in handleBackgroundRemovalChoice
        } catch (bgError) {
          console.error('Background removal failed:', bgError);
          toast.error('Failed to remove background. Continuing with original image.');
          setShowBackgroundRemovalModal(false);
          setIsRemovingBackground(false);
          
          // Continue without background removal
          await continueProductCreation(designImageUrl, designImageBase64);
        }
      } else {
        // No background removal needed, proceed directly
        await continueProductCreation(designImageUrl, designImageBase64);
      }

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
    </div>
  );
}
