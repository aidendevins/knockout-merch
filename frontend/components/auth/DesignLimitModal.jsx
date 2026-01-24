import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { Heart, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthModal from './AuthModal';

export default function DesignLimitModal({ onSignupSuccess }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleSignupSuccess = () => {
    setIsAuthModalOpen(false);
    if (onSignupSuccess) onSignupSuccess();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()} // Prevent closing on backdrop click
        className="relative w-full max-w-lg bg-gradient-to-br from-gray-900 via-red-950/30 to-gray-900 border border-pink-900/30 rounded-2xl p-8 shadow-2xl"
      >
        {/* Lock icon at top */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">
            You've Used All 10 Free Designs!
          </h2>
          <p className="text-gray-300 text-lg">
            Create a <span className="text-pink-400 font-semibold">free account</span> to continue creating unlimited designs
          </p>
        </div>

        {/* Benefits list */}
        <div className="bg-black/40 rounded-xl p-6 mb-6 space-y-3">
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="w-5 h-5 text-pink-400 flex-shrink-0" />
            <span>Unlimited design generations</span>
          </div>
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="w-5 h-5 text-pink-400 flex-shrink-0" />
            <span>Access your designs from any device</span>
          </div>
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="w-5 h-5 text-pink-400 flex-shrink-0" />
            <span>Save and manage all your creations</span>
          </div>
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="w-5 h-5 text-pink-400 flex-shrink-0" />
            <span>100% free - no credit card required</span>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => setIsAuthModalOpen(true)}
          className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-bold py-6 rounded-xl text-lg"
        >
          <Heart className="w-5 h-5 mr-2 fill-white" />
          Create Free Account
        </Button>

        {/* Note */}
        <p className="text-center text-gray-400 text-sm mt-4">
          Signing up takes less than 30 seconds
        </p>
      </motion.div>
    </div>
  );

  return (
    <>
      {ReactDOM.createPortal(modalContent, document.body)}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => {}} // Non-dismissible
        allowClose={false} // Cannot close without signing up
        defaultMode="register"
        onSuccess={handleSignupSuccess}
      />
    </>
  );
}
