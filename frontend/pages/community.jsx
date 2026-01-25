import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Filter, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import DesignCard from '@/components/community/DesignCard';

export default function Community() {
  const [sortBy, setSortBy] = useState('sales');
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');

  const { data: designs = [], isLoading } = useQuery({
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

  const filteredDesigns = designs.filter(design => {
    const matchesSearch = !search || 
      design.title?.toLowerCase().includes(search.toLowerCase()) ||
      design.creator_name?.toLowerCase().includes(search.toLowerCase());
    const matchesProduct = productFilter === 'all' || design.product_type === productFilter;
    return matchesSearch && matchesProduct;
  });

  return (
    <div className="min-h-screen bg-black pt-16 sm:pt-20 pb-8 sm:pb-12">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 mb-3 sm:mb-4 text-xs sm:text-sm">
              <Users className="w-3 h-3 mr-1" />
              Community Creations
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-3 sm:mb-4">
              Fan Designs
            </h1>
            <p className="text-gray-400 text-sm sm:text-lg max-w-xl mx-auto px-4 sm:px-0">
              Browse knockout designs created by the community. Find your favorite and grab it before it's gone.
            </p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Search - Full width on mobile */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search designs..."
              className="pl-10 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Filter row - scrollable on mobile */}
          <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {/* Sort */}
            <Tabs value={sortBy} onValueChange={setSortBy} className="flex-shrink-0">
              <TabsList className="bg-gray-900 border border-gray-800 h-9 sm:h-10">
                <TabsTrigger 
                  value="sales" 
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white gap-1 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <TrendingUp className="w-3 h-3" />
                  <span className="hidden xs:inline">Top Selling</span>
                  <span className="xs:hidden">Top</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="recent" 
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white gap-1 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Clock className="w-3 h-3" />
                  <span className="hidden xs:inline">Recent</span>
                  <span className="xs:hidden">New</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Product filter */}
            <Tabs value={productFilter} onValueChange={setProductFilter} className="flex-shrink-0">
              <TabsList className="bg-gray-900 border border-gray-800 h-9 sm:h-10">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-xs sm:text-sm px-2 sm:px-3"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="tshirt" 
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-xs sm:text-sm px-2 sm:px-3"
                >
                  <span className="hidden xs:inline">T-Shirts</span>
                  <span className="xs:hidden">Tees</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="hoodie" 
                  className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-xs sm:text-sm px-2 sm:px-3"
                >
                  Hoodies
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Designs grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-900 rounded-lg sm:rounded-xl overflow-hidden">
                <Skeleton className="aspect-square bg-gray-800" />
                <div className="p-3 sm:p-4 space-y-2">
                  <Skeleton className="h-3 sm:h-4 w-3/4 bg-gray-800" />
                  <Skeleton className="h-5 sm:h-6 w-1/2 bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDesigns.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-900 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <Filter className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No designs found</h3>
            <p className="text-gray-500 text-sm sm:text-base">
              {search ? 'Try a different search term' : 'Be the first to create a design!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {filteredDesigns.map((design, index) => (
              <DesignCard key={design.id} design={design} index={index} />
            ))}
          </div>
        )}

        {/* Stats */}
        {designs.length > 0 && (
          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-800">
            <div className="flex justify-center gap-6 sm:gap-8 text-center">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-white">{designs.length}</p>
                <p className="text-gray-500 text-xs sm:text-sm">Total Designs</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-white">
                  {designs.reduce((acc, d) => acc + (d.sales_count || 0), 0)}
                </p>
                <p className="text-gray-500 text-xs sm:text-sm">Items Sold</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}