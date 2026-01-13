import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StillsPanel from '@/components/design/StillsPanel';
import AIPanel from '@/components/design/AIPanel';
import ProductCanvas from '@/components/design/ProductCanvas';
import MockupPreview from '@/components/design/MockupPreview';
import { toast } from 'sonner';

export default function DesignStudio() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  
  const [selectedStills, setSelectedStills] = useState([]);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [productType, setProductType] = useState('tshirt');
  const [canvasData, setCanvasData] = useState({
    x: 50,
    y: 45,
    scale: 1,
    rotation: 0,
  });
  
  // Mockup preview state
  const [showMockupPreview, setShowMockupPreview] = useState(false);
  const [mockupUrls, setMockupUrls] = useState([]);
  const [currentDesign, setCurrentDesign] = useState(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Fetch fight stills
  const { data: stills = [], isLoading: stillsLoading } = useQuery({
    queryKey: ['fight-stills'],
    queryFn: () => base44.entities.FightStill.list('-created_date'),
  });

  // Create design mutation
  const createDesignMutation = useMutation({
    mutationFn: async (designData) => {
      return await base44.entities.Design.create(designData);
    },
    onSuccess: (design) => {
      queryClient.invalidateQueries(['designs']);
      queryClient.invalidateQueries(['community-designs']);
      queryClient.invalidateQueries(['featured-designs']);
      setCurrentDesign(design);
      return design;
    },
    onError: (err) => {
      toast.error('Failed to save design');
      console.error(err);
    },
  });

  const handleToggleStill = (stillId) => {
    setSelectedStills(prev => 
      prev.includes(stillId) 
        ? prev.filter(id => id !== stillId)
        : [...prev, stillId]
    );
  };

  const handleImageGenerated = (imageUrl) => {
    setGeneratedImage(imageUrl);
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
      
      if (canvasRef.current?.exportDesign) {
        try {
          const exportData = await canvasRef.current.exportDesign();
          // Upload the exported PNG to S3
          const uploadResult = await base44.uploadBase64(exportData.base64, 'designs');
          designImageUrl = uploadResult.file_url;
          toast.success('Design exported successfully');
        } catch (exportErr) {
          console.warn('Canvas export failed, using original image:', exportErr);
          // Continue with the original generated image
        }
      }

      // Step 2: Save the design to the database
      const user = await base44.auth.me();
      const designTitle = `Knockout Design ${Date.now()}`;
      
      const design = await createDesignMutation.mutateAsync({
        title: designTitle,
        design_image_url: designImageUrl,
        stills_used: selectedStills,
        product_type: productType,
        canvas_data: canvasData,
        price: productType === 'hoodie' ? 49.99 : 29.99,
        is_published: false,
        creator_name: user?.full_name || 'Anonymous',
      });

      // Step 3: Create the product on Printify
      toast.info('Creating your product...');
      
      const printifyProduct = await base44.printify.createProduct({
        title: designTitle,
        description: `Custom knockout merch design celebrating the ultimate boxing moment.`,
        designImageUrl: designImageUrl,
        productType: productType,
        canvasData: canvasData,
        designId: design.id,
      });

      // Step 4: Get mockups
      const mockups = printifyProduct.mockup_urls || [];
      
      if (mockups.length === 0) {
        // Try fetching mockups separately
        const fetchedMockups = await base44.printify.getMockups(printifyProduct.id);
        mockups.push(...fetchedMockups);
      }

      setMockupUrls(mockups);
      setCurrentDesign({ ...design, printify_product_id: printifyProduct.id, mockup_urls: mockups });
      setShowMockupPreview(true);
      
      toast.success('Product created! Review your mockups.');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!currentDesign) return;
    
    // Navigate to checkout with the design
    navigate(createPageUrl(`Checkout?designId=${currentDesign.id}`));
  };

  return (
    <div className="h-screen bg-gradient-to-br from-black via-red-950/20 to-black pt-16 flex">
      {/* AI Panel */}
      <div className="w-72 flex-shrink-0 hidden md:block">
        <AIPanel 
          selectedStills={selectedStills}
          stills={stills}
          onImageGenerated={handleImageGenerated}
          generatedImage={generatedImage}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
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
        />
      </div>

      {/* Right sidebar - Stills */}
      <div className="w-64 flex-shrink-0 hidden lg:block">
        <StillsPanel 
          stills={stills}
          selectedStills={selectedStills}
          onToggleStill={handleToggleStill}
          isLoading={stillsLoading}
        />
      </div>

      {/* Mobile panels - shown on smaller screens */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-gradient-to-br from-red-950/30 to-black border-t border-pink-900/30 p-4">
        <p className="text-center text-white/70 text-sm">
          For the best experience, please use a larger screen
        </p>
      </div>

      {/* Mockup Preview Modal */}
      <MockupPreview
        isOpen={showMockupPreview}
        onClose={() => setShowMockupPreview(false)}
        mockupUrls={mockupUrls}
        designTitle={currentDesign?.title || 'Your Design'}
        productType={productType}
        price={productType === 'hoodie' ? 49.99 : 29.99}
        onConfirm={handleConfirmPurchase}
        isLoading={false}
      />
    </div>
  );
}
