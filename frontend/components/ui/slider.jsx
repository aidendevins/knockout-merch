import * as React from "react";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef(({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
  // Handle the value - support both array format (like Radix) and single value
  const currentValue = Array.isArray(value) ? value[0] : value;
  
  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    if (onValueChange) {
      // Call with array format for compatibility with Radix UI Slider
      onValueChange([newValue]);
    }
  };

  return (
    <input
      type="range"
      className={cn(
        "w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600",
        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:cursor-pointer",
        "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0",
        className
      )}
      ref={ref}
      value={currentValue}
      onChange={handleChange}
      min={min}
      max={max}
      step={step}
      {...props}
    />
  );
});
Slider.displayName = "Slider";

export { Slider };
