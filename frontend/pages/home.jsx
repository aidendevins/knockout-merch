import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import HeroSection from '@/components/landing/HeroSection';
import FeaturedDesigns from '@/components/landing/FeaturedDesigns';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Filter, Users, Palette } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import DesignCard from '@/components/community/DesignCard';

export default function Home() {
  const communityRef = useRef(null);
  
  // Featured designs query
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

  // Community state
  const [viewType, setViewType] = useState('fan'); // 'fan' or 'studio'
  const [sortBy, setSortBy] = useState('sales');
  const [productFilter, setProductFilter] = useState('all');

  // Fan Designs query (published)
  const { data: communityDesigns = [], isLoading: communityLoading } = useQuery({
    queryKey: ['community-designs', sortBy],
    queryFn: async () => {
      const sortField = sortBy === 'sales' ? '-sales_count' : '-created_date';
      return await base44.entities.Design.filter(
        { is_published: true },
        sortField,
        50
      );
    },
  });

  // Studio Designs query (unpublished)
  const { data: studioDesigns = [], isLoading: studioLoading } = useQuery({
    queryKey: ['studio-designs', productFilter],
    queryFn: async () => {
      // Fetch unpublished designs
      const allDesigns = await base44.entities.Design.filter(
        { is_published: false },
        '-created_date',
        null
      );
      // Filter by product type if needed
      if (productFilter !== 'all') {
        return allDesigns.filter((d) => d.product_type === productFilter).slice(0, 6);
      }
      return allDesigns.slice(0, 6);
    },
    enabled: viewType === 'studio',
  });

  // Smooth scroll function
  const scrollToCommunity = () => {
    communityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filteredCommunityDesigns = communityDesigns.filter(design => {
    const matchesProduct = productFilter === 'all' || design.product_type === productFilter;
    return matchesProduct;
  });

  const filteredStudioDesigns = studioDesigns.filter(design => {
    const matchesProduct = productFilter === 'all' || design.product_type === productFilter;
    return matchesProduct;
  }).slice(0, 6); // Ensure max 6 designs

  return (
    <div className="bg-black">
      {/* Top Section: Hero + Featured Designs */}
      <section className="min-h-screen">
      <HeroSection />
        <FeaturedDesigns 
          designs={featuredDesigns} 
          onViewAll={scrollToCommunity}
        />
      </section>

      {/* Bottom Section: Community Gallery */}
      <section 
        ref={communityRef}
        id="community"
        className="min-h-screen bg-black py-20"
      >
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="bg-red-600/10 text-red-400 border-red-600/30 mb-4">
                {viewType === 'studio' ? (
                  <>
                    <Palette className="w-3 h-3 mr-1" />
                    Studio Designs
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3 mr-1" />
                    Community Creations
                  </>
                )}
              </Badge>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                {viewType === 'studio' ? 'Studio Designs' : 'Fan Designs'}
              </h1>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                {viewType === 'studio' 
                  ? 'Browse our curated studio designs. Professional quality, ready to print.'
                  : 'Browse knockout designs created by the community. Find your favorite and grab it before it is gone.'}
              </p>
            </motion.div>
          </div>

          {/* View Type Toggle and Filters */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            {/* Left side: View type toggle (Studio/Fan) */}
            <Tabs value={viewType} onValueChange={setViewType}>
              <TabsList className="bg-gray-900 border border-gray-800">
                <TabsTrigger 
                  value="studio" 
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white gap-1"
                >
                  <Palette className="w-3 h-3" />
                  Studio Designs
                </TabsTrigger>
                <TabsTrigger 
                  value="fan" 
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white gap-1"
                >
                  <Users className="w-3 h-3" />
                  Fan Designs
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Middle: Sort (only for Fan Designs) */}
            {viewType === 'fan' && (
              <Tabs value={sortBy} onValueChange={setSortBy}>
                <TabsList className="bg-gray-900 border border-gray-800">
                  <TabsTrigger 
                    value="sales" 
                    className="data-[state=active]:bg-red-600 data-[state=active]:text-white gap-1"
                  >
                    <TrendingUp className="w-3 h-3" />
                    Top Selling
                  </TabsTrigger>
                  <TabsTrigger 
                    value="recent" 
                    className="data-[state=active]:bg-red-600 data-[state=active]:text-white gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    Recent
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {/* Right side: Product filter */}
            <Tabs value={productFilter} onValueChange={setProductFilter}>
              <TabsList className="bg-gray-900 border border-gray-800">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="tshirt" 
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white"
                >
                  T-Shirts
                </TabsTrigger>
                <TabsTrigger 
                  value="hoodie" 
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white"
                >
                  Hoodies
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Designs grid */}
          {viewType === 'studio' ? (
            // Studio Designs: 2 rows x 3 columns (6 designs)
            studioLoading ? (
              <div className="grid grid-cols-3 gap-4 md:gap-6">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-gray-900 rounded-xl overflow-hidden">
                    <Skeleton className="aspect-square bg-gray-800" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4 bg-gray-800" />
                      <Skeleton className="h-6 w-1/2 bg-gray-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredStudioDesigns.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gray-900 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Filter className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No studio designs found</h3>
                <p className="text-gray-500">
                  Check back soon for new studio designs!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 md:gap-6">
                {filteredStudioDesigns.map((design, index) => (
                  <DesignCard key={design.id} design={design} index={index} />
                ))}
              </div>
            )
          ) : (
            // Fan Designs: Original grid layout
            communityLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="bg-gray-900 rounded-xl overflow-hidden">
                    <Skeleton className="aspect-square bg-gray-800" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4 bg-gray-800" />
                      <Skeleton className="h-6 w-1/2 bg-gray-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCommunityDesigns.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gray-900 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Filter className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No designs found</h3>
                <p className="text-gray-500">
                  Be the first to create a design!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {filteredCommunityDesigns.map((design, index) => (
                  <DesignCard key={design.id} design={design} index={index} />
                ))}
              </div>
            )
          )}

          {/* Stats - Only for Fan Designs */}
          {viewType === 'fan' && communityDesigns.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-800">
              <div className="flex justify-center gap-8 text-center">
                <div>
                  <p className="text-3xl font-black text-white">{communityDesigns.length}</p>
                  <p className="text-gray-500 text-sm">Total Designs</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-white">
                    {communityDesigns.reduce((acc, d) => acc + (d.sales_count || 0), 0)}
                  </p>
                  <p className="text-gray-500 text-sm">Items Sold</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 Knockout Club. Not affiliated with Jake Paul or any boxing organization.
          </p>
          <p className="text-gray-600 text-xs mt-2">
            All designs are fan-made commemorative merchandise.
          </p>
        </div>
      </footer>
    </div>
  );
}