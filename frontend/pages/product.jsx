import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Heart, Share2, ChevronLeft, ChevronRight,
  Check, Shirt, User, TrendingUp, ArrowLeft, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SIZES = ['S', 'M', 'L', 'XL', '2XL'];
const COLORS = [
  { name: 'Black', value: 'black', hex: '#000000' },
  { name: 'White', value: 'white', hex: '#FFFFFF' },
];
const PRODUCT_TYPES = [
  { name: 'T-Shirt', value: 'tshirt', price: 29.99 },
  { name: 'Hoodie', value: 'hoodie', price: 49.99 },
];

export default function Product() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { designId } = useParams();

  const [selectedSize, setSelectedSize] = useState('M');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(null); // Dynamic color selection
  const [selectedProductType, setSelectedProductType] = useState(null); // Dynamic product type selection
  const [isFetchingMockups, setIsFetchingMockups] = useState(false);
  const [mockupsByProductTypeAndColor, setMockupsByProductTypeAndColor] = useState({}); // Cache: {productType: {color: mockups}}

  // Reset state when designId changes (when navigating between different products)
  React.useEffect(() => {
    setSelectedSize('M');
    setCurrentImageIndex(0);
    setQuantity(1);
    setSelectedColor(null);
    setSelectedProductType(null);
    setIsFetchingMockups(false);
    setMockupsByProductTypeAndColor({});
  }, [designId]);

  // Fetch design
  const { data: design, isLoading } = useQuery({
    queryKey: ['design', designId],
    queryFn: async () => {
      const designs = await base44.entities.Design.filter({ id: designId });
      return designs[0];
    },
    enabled: !!designId,
  });

  // Set default color and product type from design when it loads
  React.useEffect(() => {
    if (design && !selectedColor && !selectedProductType) {
      const defaultColor = design.color || 'black';
      const defaultProductType = design.product_type || 'tshirt';
      
      setSelectedColor(defaultColor);
      setSelectedProductType(defaultProductType);
      
      // Cache the initial mockups (from the appropriate product type field)
      const mockupField = defaultProductType === 'tshirt' ? 'tshirt_mockups' : 'hoodie_mockups';
      const mockups = design[mockupField] || design.mockup_urls || [];
      
      if (mockups.length > 0) {
        const filteredMockups = filterMockupsByColor(mockups, defaultColor);
        setMockupsByProductTypeAndColor(prev => ({
          ...prev,
          [defaultProductType]: {
            ...(prev[defaultProductType] || {}),
            [defaultColor]: filteredMockups
          }
        }));
      }
    }
  }, [design, selectedColor, selectedProductType]);

  // Filter mockups by color AND select specific indices
  // Printify mockup URLs contain color information in the filename/URL
  const filterMockupsByColor = (mockups, color) => {
    if (!mockups || mockups.length === 0) return [];
    
    console.log(`🔍 Filtering mockups for color: ${color}`);
    console.log(`   Total mockups received: ${mockups.length}`);
    
    // Printify often includes color in the mockup URL or filename
    // For example: "...Black..." or "...White..." or variant IDs that differ by color
    const colorKeywords = {
      black: ['black', 'Black', 'BLACK', '3001_Solid_Black', '_black_', 'solid-black', 'Heather_Black'],
      white: ['white', 'White', 'WHITE', '3001_Solid_White', '_white_', 'solid-white', 'Heather_White']
    };
    
    const keywords = colorKeywords[color.toLowerCase()] || [];
    
    // Filter mockups that contain any of the color keywords
    const filtered = mockups.filter(url => {
      const matches = keywords.some(keyword => url.includes(keyword));
      if (matches) {
        console.log(`   ✅ Matched ${color}: ${url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('/') + 40)}...`);
      }
      return matches;
    });
    
    console.log(`   Filtered by keyword: ${filtered.length} mockups`);
    
    // If filtering resulted in empty array, use fallback
    let colorFiltered;
    if (filtered.length === 0) {
      console.warn(`   ⚠️ Could not filter mockups by color ${color} using keywords`);
      console.warn(`   ⚠️ Using fallback: split array by color consistently`);
      
      // Split mockups in half - Printify likely returns them in consistent order
      // Based on testing: WHITE mockups come FIRST, BLACK mockups come SECOND
      const midpoint = Math.ceil(mockups.length / 2);
      
      // WHITE = first half, BLACK = second half (based on Printify's ordering)
      const isWhite = color.toLowerCase() === 'white';
      colorFiltered = isWhite ? mockups.slice(0, midpoint) : mockups.slice(midpoint);
      
      console.log(`   📋 Requested color: ${color}`);
      console.log(`   📋 Using ${isWhite ? 'FIRST' : 'SECOND'} half (${isWhite ? 'WHITE' : 'BLACK'}): ${colorFiltered.length} mockups`);
      console.log(`   📋 Sample URL: ${colorFiltered[0]?.substring(0, 100)}...`);
    } else {
      colorFiltered = filtered;
    }
    
    // Now select only specific indices: 1, 3, 5, 9, 10 (which are array indices 0, 2, 4, 8, 9)
    const selectedIndices = [0, 2, 4, 8, 9];
    const selectedMockups = selectedIndices
      .map(index => colorFiltered[index])
      .filter(Boolean); // Remove undefined if array is shorter than expected
    
    console.log(`   ✅ Final result: ${selectedMockups.length} mockups (from indices: 1,3,5,9,10)`);
    
    return selectedMockups;
  };

  // Fetch mockups for a specific product type and color
  const fetchMockupsForProductTypeAndColor = async (productType, color) => {
    // Check if we already have mockups for this combination cached
    if (mockupsByProductTypeAndColor[productType]?.[color]) {
      return mockupsByProductTypeAndColor[productType][color];
    }

    // Get the appropriate product ID
    const productIdField = productType === 'tshirt' ? 'printify_tshirt_id' : 'printify_hoodie_id';
    const productId = design?.[productIdField];
    
    if (!productId) {
      console.warn(`No product ID found for ${productType}`);
      return [];
    }

    setIsFetchingMockups(true);
    try {
      // Fetch ALL mockups from Printify for this product
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/printify/products/${productId}/mockups`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch mockups');
      }
      
      const allMockups = await response.json();
      
      // Filter mockups by the requested color
      const colorMockups = filterMockupsByColor(allMockups, color);
      
      console.log(`Fetched ${allMockups.length} total ${productType} mockups, filtered to ${colorMockups.length} for ${color}`);
      
      // Cache the mockups
      setMockupsByProductTypeAndColor(prev => ({
        ...prev,
        [productType]: {
          ...(prev[productType] || {}),
          [color]: colorMockups
        }
      }));
      
      return colorMockups;
    } catch (error) {
      console.error('Error fetching mockups:', error);
      toast.error(`Failed to load ${productType} mockups`);
      return [];
    } finally {
      setIsFetchingMockups(false);
    }
  };

  // Handle color change
  const handleColorChange = async (newColor) => {
    setSelectedColor(newColor);
    setCurrentImageIndex(0); // Reset to first image
    
    // Fetch mockups for the new color (current product type)
    await fetchMockupsForProductTypeAndColor(selectedProductType, newColor);
  };

  // Handle product type change
  const handleProductTypeChange = async (newProductType) => {
    setSelectedProductType(newProductType);
    setCurrentImageIndex(0); // Reset to first image
    
    // Fetch mockups for the new product type (current color)
    await fetchMockupsForProductTypeAndColor(newProductType, selectedColor);
  };

  // Get current mockups for selected product type and color
  const currentMockups = mockupsByProductTypeAndColor[selectedProductType]?.[selectedColor] || [];
  
  // Create image gallery (ONLY mockups, no design image)
  const images = currentMockups;

  const currentPrice = PRODUCT_TYPES.find(pt => pt.value === selectedProductType)?.price || 29.99;

  const handleAddToCart = () => {
    const productData = {
      ...design,
      product_type: selectedProductType,
      price: currentPrice,
      selectedColor,
    };
    
    addToCart(productData, selectedSize, quantity);
    
    toast.success('Added to cart!', {
      description: `${design.title} - ${selectedProductType === 'tshirt' ? 'T-Shirt' : 'Hoodie'} (${selectedColor}, ${selectedSize})`,
      duration: 2000,
    });
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Design not found</h2>
          <Link to={createPageUrl('Home')}>
            <Button className="mt-4 bg-red-600 hover:bg-red-700">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

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
                      alt={design.title}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <Shirt className="w-32 h-32 text-gray-700" />
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
                {images.map((img, idx) => (
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
              <div className="flex items-center gap-2 mb-2">
                {design.creator_name && (
                  <Badge className="bg-gray-800 text-gray-300 border-gray-700">
                    <User className="w-3 h-3 mr-1" />
                    {design.creator_name}
                  </Badge>
                )}
                {design.sales_count > 0 && (
                  <Badge className="bg-green-600/10 text-green-400 border-green-600/30">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {design.sales_count} sold
                  </Badge>
                )}
              </div>
              
              <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
                {design.title}
              </h1>
              
              {design.prompt_used && (
                <p className="text-gray-400 leading-relaxed">
                  {design.prompt_used}
                </p>
              )}
            </div>

            <Separator className="bg-gray-800" />

            {/* Product Type Selection - Now Interactive! */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-white font-semibold">
                  Product Type
                </label>
              </div>
              <div className="flex gap-3">
                {PRODUCT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleProductTypeChange(type.value)}
                    disabled={isFetchingMockups}
                    className={cn(
                      "flex-1 py-4 px-4 rounded-xl border-2 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                      selectedProductType === type.value
                        ? "border-pink-500 bg-gradient-to-r from-pink-600/10 to-red-600/10 text-white shadow-lg shadow-pink-600/20"
                        : "border-gray-800 hover:border-gray-700 text-gray-400 bg-gray-900 hover:bg-gray-800"
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Shirt className="w-5 h-5" />
                      <span>{type.name}</span>
                      <span className="text-xs text-gray-500">${type.price}</span>
                      {selectedProductType === type.value && (
                        <Check className="w-4 h-4 mt-1" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Separator className="bg-gray-800" />

            {/* Color Selection - Now Interactive! */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-white font-semibold">
                  Color
                </label>
                {isFetchingMockups && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading mockups...
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => handleColorChange(color.value)}
                    disabled={isFetchingMockups}
                    className={cn(
                      "flex-1 py-4 px-4 rounded-xl border-2 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                      selectedColor === color.value
                        ? "border-pink-500 bg-gradient-to-r from-pink-600/10 to-red-600/10 text-white shadow-lg shadow-pink-600/20"
                        : "border-gray-800 hover:border-gray-700 text-gray-400 bg-gray-900 hover:bg-gray-800"
                    )}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full border-2 border-gray-600"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span>{color.name}</span>
                      {selectedColor === color.value && (
                        <Check className="w-4 h-4 ml-1" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <label className="text-white font-semibold mb-3 block">
                Size
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
                  ${(currentPrice * quantity).toFixed(2)}
                </span>
                {quantity > 1 && (
                  <span className="text-gray-500">
                    ${currentPrice.toFixed(2)} each
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleAddToCart}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-7 rounded-xl"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  variant="outline"
                  className="w-14 h-14 p-0 border-gray-800 hover:border-gray-700 rounded-xl"
                >
                  <Heart className="w-5 h-5 text-gray-400" />
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full border-gray-800 hover:border-gray-700 text-white py-6 rounded-xl"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share This Design
              </Button>
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

