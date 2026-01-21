import React, { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/apiClient';
import HeroSection from '@/components/landing/HeroSection';
import StudioCarousel from '@/components/landing/StudioCarousel';
import { Skeleton } from '@/components/ui/skeleton';
import ShaderBackground from '@/components/ui/shader-background';

export default function Home() {
  // Fetch all visible templates (curated collection)
  const { data: templateProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['template-products'],
    queryFn: async () => {
      try {
        // Fetch all non-hidden templates
        const templates = await apiClient.entities.Template.listWithProducts();
        console.log('Template products fetched:', templates);
        
        // Transform templates to match the expected product format
        return templates.map(template => ({
          id: template.printify_product_id || template.id, // Use Printify ID if available, otherwise template ID
          template_id: template.id,
          title: template.display_title || template.name,
          description: template.description,
          mockup_urls: template.mockup_urls || [],
          reference_image: template.reference_image, // Template reference image
          price: template.price || 29.99,
          product_type: 'tshirt', // Default
          color: 'black', // Default
          has_printify_product: !!template.printify_product_id, // Track if it has a Printify product
        }));
      } catch (error) {
        console.error('Error fetching template products:', error);
        throw error;
      }
    },
  });

  return (
    <div className="relative min-h-screen">
      {/* Global Shader Background - covers entire page */}
      <div className="fixed inset-0 z-0">
        <Suspense fallback={
          <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-black to-pink-950" />
        }>
          <ShaderBackground />
        </Suspense>
      </div>

      {/* Page Content */}
      <div className="relative z-10">
        {/* Hero Section with Product Carousel - uses template products */}
        <HeroSection products={templateProducts} isLoading={productsLoading} />

        {/* Studio Collection Carousel */}
        {productsLoading ? (
          <section className="py-24 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 text-center mb-12 relative z-10">
              <div className="inline-block bg-gradient-to-r from-pink-600 to-red-600 text-white border-0 rounded-full px-4 py-1.5 text-sm mb-4 shadow-lg shadow-pink-600/30">
                Studio Collection
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">
                Loading...
              </h2>
            </div>
            <div className="flex gap-6 overflow-x-hidden px-4 md:px-12 relative z-10">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[350px] md:w-[400px]">
                  <div className="bg-gradient-to-b from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-pink-900/30">
                    <Skeleton className="aspect-[3/4] bg-gray-800/50" />
                    <div className="p-6 space-y-3">
                      <Skeleton className="h-6 w-3/4 bg-gray-800/50" />
                      <Skeleton className="h-8 w-1/2 bg-gray-800/50" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : templateProducts.length === 0 ? (
          <section className="py-24 relative overflow-hidden">
            <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-900/30 to-red-900/30 rounded-full mx-auto mb-6 flex items-center justify-center border border-pink-600/30">
                <span className="text-4xl">💕</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Coming Soon</h3>
              <p className="text-pink-300/70 text-lg">
                Our curated collection is being prepared. Check back soon!
              </p>
            </div>
          </section>
        ) : (
          <StudioCarousel designs={templateProducts} />
        )}
      
        {/* Footer */}
        <footer className="border-t border-pink-900/20 py-12 mt-24">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-pink-300/60 text-sm">
              © 2026 LoveForge. Spread the love with custom Valentine's shirts.
            </p>
            <p className="text-pink-300/40 text-xs mt-2">
              Made with 💕 for Valentine's Day
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
