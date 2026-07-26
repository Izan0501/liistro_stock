import React, { useState, useRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  glowColor?: string;
  backgroundColor?: string;
  textColor?: string;
  hoverTextColor?: string;
}

export const HoverButton: React.FC<ButtonProps> = ({
  children,
  className = '',
  glowColor = '#6366f1',
  backgroundColor = '#0f172a',
  textColor = '#e2e8f0',
  hoverTextColor = '#ffffff',
  disabled,
  ...rest
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <button
      ref={buttonRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      disabled={disabled}
      style={{
        backgroundColor,
        color: isHovered ? hoverTextColor : textColor,
        transition: 'color 0.3s ease',
      }}
      className={`relative overflow-hidden rounded-lg border border-white/10 font-medium px-4 py-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {/* Radial glow that follows mouse */}
      <span
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(80px circle at ${mousePosition.x}px ${mousePosition.y}px, ${glowColor}55, transparent 80%)`,
        }}
      />
      {/* Border glow layer */}
      <span
        className="pointer-events-none absolute inset-0 rounded-lg transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          boxShadow: `inset 0 0 0 1px ${glowColor}66`,
        }}
      />
      {/* Outer shadow pulse */}
      <span
        className={`pointer-events-none absolute -inset-1 rounded-xl blur-md transition-all duration-300 -z-10 ${isHovered ? 'scale-125' : 'scale-0'}`}
        style={{
          background: `radial-gradient(ellipse at center, ${glowColor}44, transparent 70%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2 w-full">
        {children}
      </span>
    </button>
  );
};
