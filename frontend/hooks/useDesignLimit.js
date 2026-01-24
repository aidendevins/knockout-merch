import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'guest_design_count';
const MAX_FREE_DESIGNS = 10;

export function useDesignLimit() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  // Load count from localStorage on mount
  useEffect(() => {
    if (!user) {
      const stored = localStorage.getItem(STORAGE_KEY);
      const initialCount = stored ? parseInt(stored, 10) : 0;
      setCount(initialCount);
    } else {
      // Logged in users have unlimited designs
      setCount(0);
    }
  }, [user]);

  // Count existing designs in localStorage on first load
  useEffect(() => {
    if (!user) {
      const existingDesigns = JSON.parse(localStorage.getItem('userDesigns') || '[]');
      const existingCount = existingDesigns.length;
      
      // If we have existing designs but no count stored, initialize with existing count
      const storedCount = localStorage.getItem(STORAGE_KEY);
      if (!storedCount && existingCount > 0) {
        const newCount = Math.min(existingCount, MAX_FREE_DESIGNS);
        localStorage.setItem(STORAGE_KEY, newCount.toString());
        setCount(newCount);
      }
    }
  }, [user]);

  const incrementCount = () => {
    if (!user) {
      const newCount = count + 1;
      localStorage.setItem(STORAGE_KEY, newCount.toString());
      setCount(newCount);
    }
  };

  const resetCount = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCount(0);
  };

  const isAtLimit = !user && count >= MAX_FREE_DESIGNS;
  const isWarning = !user && (count === 8 || count === 9);
  const remaining = user ? Infinity : MAX_FREE_DESIGNS - count;

  return {
    count,
    remaining,
    maxFree: MAX_FREE_DESIGNS,
    isAtLimit,
    isWarning,
    incrementCount,
    resetCount,
  };
}
