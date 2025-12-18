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
    <div className="min-h-screen bg-black pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 mb-4">
              <Users className="w-3 h-3 mr-1" />
              Community Creations
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
              Fan Designs
            </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Browse knockout designs created by the community. Find your favorite and grab it before it's gone.
            </p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search designs..."
              className="pl-10 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Sort */}
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

          {/* Product filter */}
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
        {isLoading ? (
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
        ) : filteredDesigns.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-900 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Filter className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No designs found</h3>
            <p className="text-gray-500">
              {search ? 'Try a different search term' : 'Be the first to create a design!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredDesigns.map((design, index) => (
              <DesignCard key={design.id} design={design} index={index} />
            ))}
          </div>
        )}

        {/* Stats */}
        {designs.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex justify-center gap-8 text-center">
              <div>
                <p className="text-3xl font-black text-white">{designs.length}</p>
                <p className="text-gray-500 text-sm">Total Designs</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white">
                  {designs.reduce((acc, d) => acc + (d.sales_count || 0), 0)}
                </p>
                <p className="text-gray-500 text-sm">Items Sold</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}