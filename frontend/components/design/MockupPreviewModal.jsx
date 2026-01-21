import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ChevronLeft, ChevronRight, Check, ArrowLeft,
    Loader2, ShoppingCart, Sparkles, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * MockupPreviewModal - Displays product mockups after Printify product creation
 * Allows users to accept (proceed to checkout) or decline (delete product and go back)
 */
export default function MockupPreviewModal({
    isOpen,
    onClose,
    mockupUrls = [],
    productData = null,
    isLoading = false,
    onAccept,
    onDecline,
    isDeleting = false,
}) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    if (!isOpen) return null;

    const images = mockupUrls.length > 0 ? mockupUrls : [];

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const productTypeName = productData?.productType === 'hoodie' ? 'Hoodie' : 'T-Shirt';
    const colorName = productData?.color === 'white' ? 'White' : 'Black';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {isLoading ? (
                        /* Loading State */
                        <div className="flex flex-col items-center justify-center py-24 px-8">
                            <Loader2 className="w-16 h-16 animate-spin text-red-500 mb-6" />
                            <h2 className="text-2xl font-bold text-white mb-2">Generating Mockups</h2>
                            <p className="text-gray-400 text-center max-w-md">
                                Creating beautiful product mockups for your design. This usually takes a few seconds...
                            </p>
                        </div>
                    ) : (
                        /* Content */
                        <div className="grid md:grid-cols-2 gap-0">
                            {/* Left - Image Gallery */}
                            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 aspect-square md:aspect-auto md:h-full flex items-center justify-center">
                                {images.length > 0 ? (
                                    <>
                                        <AnimatePresence mode="wait">
                                            <motion.img
                                                key={currentImageIndex}
                                                src={images[currentImageIndex]}
                                                alt={`Mockup ${currentImageIndex + 1}`}
                                                className="max-w-full max-h-[400px] object-contain p-8"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            />
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
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-8">
                                        <Package className="w-24 h-24 text-gray-700 mb-4" />
                                        <p className="text-gray-500">No mockups available</p>
                                    </div>
                                )}
                            </div>

                            {/* Right - Product Info & Actions */}
                            <div className="p-8 flex flex-col">
                                {/* Header */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full flex items-center gap-1">
                                            <Check className="w-3 h-3" />
                                            Product Created
                                        </span>
                                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-full flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            AI Generated
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-black text-white mb-2">
                                        {productData?.title || 'Your Custom Design'}
                                    </h2>
                                    <p className="text-gray-400">
                                        Review your {productTypeName.toLowerCase()} mockups and proceed to checkout
                                    </p>
                                </div>

                                {/* Product Details */}
                                <div className="flex-1">
                                    <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 mb-6">
                                        <h3 className="text-white font-semibold mb-3">Product Details</h3>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <span className="text-gray-500">Type</span>
                                                <p className="text-white font-medium">{productTypeName}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Color</span>
                                                <p className="text-white font-medium">{colorName}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Price</span>
                                                <p className="text-white font-medium">${productData?.price?.toFixed(2) || '29.99'}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Mockups</span>
                                                <p className="text-white font-medium">{images.length} available</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Thumbnail Gallery */}
                                    {images.length > 1 && (
                                        <div className="mb-6">
                                            <div className="grid grid-cols-4 gap-2">
                                                {images.slice(0, 8).map((img, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setCurrentImageIndex(idx)}
                                                        className={cn(
                                                            "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                                                            currentImageIndex === idx
                                                                ? "border-red-500 scale-95"
                                                                : "border-gray-700 hover:border-gray-600"
                                                        )}
                                                    >
                                                        <img
                                                            src={img}
                                                            alt={`Thumbnail ${idx + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3 pt-4 border-t border-gray-800">
                                    <Button
                                        onClick={onAccept}
                                        disabled={isDeleting}
                                        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-6 text-lg rounded-xl"
                                    >
                                        <ShoppingCart className="w-5 h-5 mr-2" />
                                        Accept & Checkout
                                    </Button>
                                    <Button
                                        onClick={onDecline}
                                        disabled={isDeleting}
                                        variant="outline"
                                        className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white font-medium py-6 rounded-xl"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Removing Product...
                                            </>
                                        ) : (
                                            <>
                                                <ArrowLeft className="w-4 h-4 mr-2" />
                                                Go Back & Edit
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-gray-500 text-xs text-center">
                                        Going back will delete this product and return to the editor
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
