import React from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Check, Sparkles, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function StillsPanel({ stills, selectedStills, onToggleStill, isLoading }) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-red-950/30 to-black border-l border-pink-900/30">
      {/* Header */}
      <div className="p-4 border-b border-pink-900/30">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-pink-500" />
          <h3 className="font-bold text-white">Your Photos</h3>
        </div>
        <p className="text-xs text-white/60">
          Select images to use in your design
        </p>
        {selectedStills.length > 0 && (
          <Badge className="mt-2 bg-pink-600/20 text-pink-400 border-pink-600/30">
            {selectedStills.length} selected
          </Badge>
        )}
      </div>

      {/* Stills grid */}
      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-lg bg-black/40 border border-pink-900/30" />
            ))}
          </div>
        ) : stills?.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            <Heart className="w-12 h-12 mx-auto mb-3 opacity-50 text-pink-500" />
            <p className="text-sm">No photos yet</p>
            <p className="text-xs mt-1">Upload your first photo!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {stills?.map((still) => {
              const isSelected = selectedStills.includes(still.id);
              
              return (
                <motion.button
                  key={still.id}
                  onClick={() => onToggleStill(still.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "relative aspect-video rounded-lg overflow-hidden border-2 transition-all",
                    isSelected 
                      ? "border-pink-500 ring-2 ring-pink-500/30" 
                      : "border-transparent hover:border-pink-900/50"
                  )}
                >
                  <img 
                    src={still.image_url} 
                    alt={still.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Failed to load image:', still.image_url, e);
                      // Show placeholder on error
                      e.target.style.display = 'none';
                      if (!e.target.parentElement.querySelector('.error-placeholder')) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'error-placeholder absolute inset-0 bg-black/40 flex items-center justify-center text-white/60 text-xs';
                        placeholder.textContent = 'Failed to load';
                        e.target.parentElement.appendChild(placeholder);
                      }
                    }}
                  />
                  
                  {/* Overlay */}
                  <div className={cn(
                    "absolute inset-0 transition-opacity",
                    isSelected ? "bg-pink-500/20" : "bg-black/0 hover:bg-black/30"
                  )} />
                  
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-gradient-to-r from-pink-600 to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-pink-600/50">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  
                  {/* Featured badge */}
                  {still.is_featured && (
                    <div className="absolute bottom-1 left-1">
                      <Badge className="bg-gradient-to-r from-pink-600 to-red-600 text-white text-[10px] px-1.5 py-0">
                        <Heart className="w-2 h-2 mr-0.5" />
                        Favorite
                      </Badge>
                    </div>
                  )}
                  
                  {/* Title tooltip */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white text-[10px] truncate">{still.title}</p>
                    {still.round && (
                      <p className="text-gray-400 text-[9px]">Round {still.round}</p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}