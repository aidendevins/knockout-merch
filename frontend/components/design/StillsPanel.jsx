import React from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Check, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function StillsPanel({ stills, selectedStills, onToggleStill, isLoading }) {
  return (
    <div className="h-full flex flex-col bg-gray-950 border-r border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-white">Fight Stills</h3>
        </div>
        <p className="text-xs text-gray-500">
          Select images to use in your AI generation
        </p>
        {selectedStills.length > 0 && (
          <Badge className="mt-2 bg-red-600/20 text-red-400 border-red-600/30">
            {selectedStills.length} selected
          </Badge>
        )}
      </div>

      {/* Stills grid */}
      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-lg bg-gray-800" />
            ))}
          </div>
        ) : stills?.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No stills available yet</p>
            <p className="text-xs mt-1">Check back after the fight!</p>
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
                      ? "border-red-500 ring-2 ring-red-500/30" 
                      : "border-transparent hover:border-gray-700"
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
                        placeholder.className = 'error-placeholder absolute inset-0 bg-gray-800 flex items-center justify-center text-gray-500 text-xs';
                        placeholder.textContent = 'Failed to load';
                        e.target.parentElement.appendChild(placeholder);
                      }
                    }}
                  />
                  
                  {/* Overlay */}
                  <div className={cn(
                    "absolute inset-0 transition-opacity",
                    isSelected ? "bg-red-500/20" : "bg-black/0 hover:bg-black/30"
                  )} />
                  
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  
                  {/* Featured badge */}
                  {still.is_featured && (
                    <div className="absolute bottom-1 left-1">
                      <Badge className="bg-yellow-500/90 text-black text-[10px] px-1.5 py-0">
                        <Sparkles className="w-2 h-2 mr-0.5" />
                        Hot
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