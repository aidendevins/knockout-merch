import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import HeroSection from '@/components/landing/HeroSection';
import StudioCarousel from '@/components/landing/StudioCarousel';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  // Studio Designs query (unpublished - the 6 available designs)
  const { data: studioDesigns = [], isLoading: studioLoading } = useQuery({
    queryKey: ['studio-designs'],
    queryFn: async () => {
      try {
        // Fetch unpublished designs (studio collection)
        const allDesigns = await base44.entities.Design.filter(
          { is_published: false },
          '-created_date',
          null
        );
        console.log('Studio designs fetched:', allDesigns);
        return allDesigns.slice(0, 6); // Show max 6 designs
      } catch (error) {
        console.error('Error fetching studio designs:', error);
        throw error;
      }
    },
  });

  return (
    <div className="bg-black min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Studio Designs Carousel */}
      {studioLoading ? (
        <section className="py-24 bg-black">
          <div className="max-w-7xl mx-auto px-4 text-center mb-12">
            <div className="inline-block bg-red-600/10 text-red-400 border border-red-600/30 rounded-full px-3 py-1 text-sm mb-4">
              Studio Collection
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
              Loading...
            </h2>
          </div>
          <div className="flex gap-6 overflow-x-hidden px-4 md:px-12">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[350px] md:w-[400px]">
                <div className="bg-gray-900 rounded-2xl overflow-hidden">
                  <Skeleton className="aspect-[3/4] bg-gray-800" />
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-6 w-3/4 bg-gray-800" />
                    <Skeleton className="h-8 w-1/2 bg-gray-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : studioDesigns.length === 0 ? (
        <section className="py-24 bg-black">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="w-20 h-20 bg-gray-900 rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-4xl">🥊</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No Studio Designs Yet</h3>
            <p className="text-gray-400 text-lg">
              Check back soon for new studio designs!
            </p>
          </div>
        </section>
      ) : (
        <StudioCarousel designs={studioDesigns} />
      )}
      
      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            © 2026 Knockout Club. Not affiliated with Jake Paul or any boxing organization.
          </p>
          <p className="text-gray-600 text-xs mt-2">
            All designs are fan-made commemorative merchandise.
          </p>
        </div>
      </footer>
    </div>
  );
}