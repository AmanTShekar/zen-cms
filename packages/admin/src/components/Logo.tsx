import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | number;
}

const Logo: React.FC<LogoProps> = ({ className, size = 'md' }) => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const sizeClass = typeof size === 'number' ? `w-[${size}px] h-[${size}px]` : sizeMap[size];
  const inlineStyle = typeof size === 'number' ? { width: size, height: size } : {};

  return (
    <div 
      className={cn(
        "bg-current", // Inherits the text color
        sizeClass,
        className
      )}
      style={{
        ...inlineStyle,
        maskImage: 'url("/logo/zenith.svg")',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        maskSize: 'contain',
        WebkitMaskImage: 'url("/logo/zenith.svg")',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        WebkitMaskSize: 'contain',
      }}
    />
  );
};

export default Logo;
