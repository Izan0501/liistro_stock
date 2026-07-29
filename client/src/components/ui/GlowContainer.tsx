import React, { useState, useRef } from 'react';

interface GlowContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const GlowContainer: React.FC<GlowContainerProps> = ({ children, className = '' }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden w-full h-full ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* The Glowing Blob */}
      <div
        className={`absolute pointer-events-none w-[400px] h-[400px] bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 rounded-full blur-3xl transition-opacity duration-500 z-0 ${
          isHovering ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transform: `translate(${mousePosition.x - 200}px, ${mousePosition.y - 200}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      />
      {/* Modal Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
