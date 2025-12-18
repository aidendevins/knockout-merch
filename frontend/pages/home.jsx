import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import HeroSection from '@/components/landing/HeroSection';
import FeaturedDesigns from '@/components/landing/FeaturedDesigns';

export default function Home() {
  const { data: featuredDesigns = [] } = useQuery({
    queryKey: ['featured-designs'],
    queryFn: async () => {
      const designs = await base44.entities.Design.filter(
        { is_featured: true, is_published: true },
        '-sales_count',
        6
      );
      return designs;
    },
  });

  return (
    <div className="min-h-screen bg-black">
      <HeroSection />
      <FeaturedDesigns designs={featuredDesigns} />
      
      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 KO Merch. Not affiliated with Jake Paul or any boxing organization.
          </p>
          <p className="text-gray-600 text-xs mt-2">
            All designs are fan-made commemorative merchandise.
          </p>
        </div>
      </footer>
    </div>
  );
}