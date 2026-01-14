import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, ChevronLeft, ChevronRight,
  Check, ArrowLeft, Sparkles, Loader2, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { createPageUrl } from '@/utils';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

const SIZES = ['S', 'M', 'L', 'XL', '2XL'];

export default function ProductPreview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  
  const [productData, setProductData] = useState(null);
  const [selectedSize, setSelectedSize] = useState('M');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [mockupUrls, setMockupUrls] = useState([]);

  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const data = JSON.parse(decodeURIComponent(dataParam));
        setProductData(data);
        
        // If we have mockup URLs, use them
        if (data.mockupUrls && data.mockupUrls.length > 0) {
          setMockupUrls(data.mockupUrls);
          setIsLoading(false);
        } else if (data.printifyProductId) {
          // Try to fetch mockups from Printify
          fetchMockups(data.printifyProductId);
        } else {
          setIsLoading(false);
        }
      } catch (e) {
        console.error('Failed to parse product data:', e);
        toast.error('Invalid product data');
        navigate(createPageUrl('DesignStudio'));
      }
    } else {
      toast.error('No product data found');
      navigate(createPageUrl('DesignStudio'));
    }
  }, [searchParams, navigate]);

  const fetchMockups = async (productId) => {
    try {
      const mockups = await base44.printify.getMockups(productId);
      if (mockups && mockups.length > 0) {
        setMockupUrls(mockups);
      }
    } catch (error) {
      console.error('Failed to fetch mockups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create image gallery
  const images = mockupUrls.length > 0 
    ? mockupUrls 
    : (productData?.designImageUrl ? [productData.designImageUrl] : []);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleAddToCart = () => {
    if (!productData) return;
    
    const cartItem = {
      id: productData.designId,
      title: productData.title,
      design_image_url: productData.designImageUrl,
      product_type: productData.productType,
      price: productData.price,
      selectedColor: productData.color,
      printify_product_id: productData.printifyProductId,
      mockup_urls: mockupUrls,
    };
    
    addToCart(cartItem, selectedSize, quantity);
    
    toast.success('Added to cart!', {
      description: `${productData.title} - ${productData.productType === 'tshirt' ? 'T-Shirt' : 'Hoodie'} (${productData.color}, ${selectedSize})`,
      duration: 2000,
    });
  };

  const handleProceedToCheckout = () => {
    // First add to cart, then navigate to checkout
    handleAddToCart();
    navigate(createPageUrl('Checkout'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-white text-lg">Loading your product...</p>
          <p className="text-gray-400 text-sm mt-2">Generating mockups, this may take a moment</p>
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Product not found</h2>
          <Button 
            onClick={() => navigate(createPageUrl('DesignStudio'))}
            className="mt-4 bg-red-600 hover:bg-red-700"
          >
            Back to Design Studio
          </Button>
        </div>
      </div>
    );
  }

  const productTypeName = productData.productType === 'tshirt' ? 'T-Shirt' : 'Hoodie';
  const colorName = productData.color === 'black' ? 'Black' : 'White';

  return (
    <div className="min-h-screen bg-black pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(createPageUrl('DesignStudio'))}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Design Studio
        </button>

        {/* Success Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Product Created Successfully!</h3>
              <p className="text-gray-400 text-sm">Select your size and quantity below to add to cart</p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left - Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <Card className="relative bg-gray-900 border-gray-800 overflow-hidden aspect-square">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-gray-800 to-gray-900"
                >
                  {images[currentImageIndex] ? (
                    <img
                      src={images[currentImageIndex]}
                      alt={productData.title}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <Package className="w-32 h-32 text-gray-700" />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </Card>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.slice(0, 8).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={cn(
                      "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                      currentImageIndex === idx
                        ? "border-red-500 scale-95"
                        : "border-gray-800 hover:border-gray-700"
                    )}
                  >
                    <img
                      src={img}
                      alt={`View ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right - Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-red-600 text-white">
                  {productTypeName}
                </Badge>
                <Badge className={cn(
                  "border",
                  productData.color === 'black' 
                    ? "bg-gray-900 text-white border-gray-700" 
                    : "bg-white text-gray-900 border-gray-300"
                )}>
                  {colorName}
                </Badge>
                <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Generated
                </Badge>
              </div>
              
              <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
                {productData.title}
              </h1>
              
              <p className="text-gray-400 leading-relaxed">
                Your custom knockout design on a premium {productTypeName.toLowerCase()}.
                Made with high-quality materials for comfort and durability.
              </p>
            </div>

            <Separator className="bg-gray-800" />

            {/* Product Details - Read Only */}
            <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
              <h3 className="text-white font-semibold mb-3">Your Selection</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Product Type:</span>
                  <span className="text-white ml-2">{productTypeName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Color:</span>
                  <span className="text-white ml-2">{colorName}</span>
                </div>
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <label className="text-white font-semibold mb-3 block">
                Select Size
              </label>
              <div className="flex gap-2">
                {SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl border-2 font-bold transition-all",
                      selectedSize === size
                        ? "border-red-500 bg-red-500/10 text-white"
                        : "border-gray-800 hover:border-gray-700 text-gray-400 bg-gray-900"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-white font-semibold mb-3 block">
                Quantity
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-white font-bold transition-all"
                >
                  -
                </button>
                <span className="text-2xl font-black text-white w-12 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-white font-bold transition-all"
                >
                  +
                </button>
              </div>
            </div>

            <Separator className="bg-gray-800" />

            {/* Price and Actions */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black text-white">
                  ${(productData.price * quantity).toFixed(2)}
                </span>
                {quantity > 1 && (
                  <span className="text-gray-500">
                    ${productData.price.toFixed(2)} each
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleAddToCart}
                  variant="outline"
                  className="flex-1 border-gray-700 text-white hover:bg-gray-800 font-bold text-lg py-7 rounded-xl"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  onClick={handleProceedToCheckout}
                  className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold text-lg py-7 rounded-xl"
                >
                  Buy Now
                </Button>
              </div>
            </div>

            {/* Features */}
            <Card className="bg-gray-900 border-gray-800 p-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-600/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-white font-semibold mb-1">Premium Quality</p>
                    <p className="text-gray-400 text-sm">
                      High-quality print on comfortable, durable fabric
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-600/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-white font-semibold mb-1">Fast Shipping</p>
                    <p className="text-gray-400 text-sm">
                      Ships within 3-5 business days
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-600/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-white font-semibold mb-1">30-Day Returns</p>
                    <p className="text-gray-400 text-sm">
                      Not satisfied? Full refund within 30 days
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

